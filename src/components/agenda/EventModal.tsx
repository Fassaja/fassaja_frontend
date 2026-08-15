import React, { useEffect, useState } from 'react';
import { Trash2, MapPin, Link2, Check, AlertTriangle, Bell, Repeat, Sun } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { MoreOptions } from '@/components/common/MoreOptions';
import { Button } from '@/components/common/Button';
import { DatePicker } from '@/components/common/DatePicker';
import { TimePicker } from '@/components/common/TimePicker';
import { Dropdown } from '@/components/common/Dropdown';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useEvents } from '@/contexts/EventsContext';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';
import { CalendarEvent } from '@/types/event';
import { REMINDER_OPTIONS, reminderTriggerDate } from '@/utils/eventReminders';
import { plusOneHour } from '@/utils/agendaTimeline';
import {
  WEEKDAY_OPTIONS,
  REPEAT_OPTIONS,
  DEFAULT_REPEAT_VALUE,
  expandWeekdayDates,
} from '@/utils/eventRecurrence';
import { pushService, pushSupported } from '@/services/pushService';

// Suporte a notificações do navegador (ausente em browsers antigos).
const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Evento a editar; ausente => criação. */
  event?: CalendarEvent | null;
  /** Data pré-selecionada na criação ('YYYY-MM-DD'). */
  defaultDate?: string;
  /** Horário pré-selecionado na criação ('HH:MM'), vindo do clique na timeline. */
  defaultStartTime?: string;
}

const EVENT_COLORS = [
  '#2477FF',
  '#8B5CF6',
  '#22C55E',
  '#F43F5E',
  '#FBBF24',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  defaultDate,
  defaultStartTime,
}) => {
  const { createEvent, updateEvent, deleteEvent } = useEvents();
  const { tasks } = useTasks();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [taskId, setTaskId] = useState('');
  const [reminder, setReminder] = useState(''); // '' = sem lembrete; senão minutos
  // Recorrência semanal (apenas na criação): dias da semana escolhidos e por
  // quanto tempo repetir. Vazio => evento único na data escolhida.
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(DEFAULT_REPEAT_VALUE);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationsSupported ? Notification.permission : 'unsupported',
  );

  const isEditing = !!event;

  // (Re)inicializa o formulário sempre que abrir.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setAllDay(event.allDay);
      setStartTime(event.startTime ?? '');
      setEndTime(event.endTime ?? '');
      setColor(event.color);
      setLocation(event.location ?? '');
      setLink(event.link ?? '');
      setDescription(event.description ?? '');
      setTaskId(event.taskId ?? '');
      setReminder(
        event.reminderMinutes !== null && event.reminderMinutes !== undefined
          ? String(event.reminderMinutes)
          : '',
      );
      // Edição mexe num único evento; a recorrência só aparece na criação.
      setWeekdays([]);
      setRepeatWeeks(DEFAULT_REPEAT_VALUE);
    } else {
      setTitle('');
      setDate(defaultDate ?? '');
      setAllDay(false);
      // Clicar numa faixa da timeline já traz o horário; sem isso, 09:00.
      const start = defaultStartTime ?? '09:00';
      setStartTime(start);
      setEndTime(plusOneHour(start));
      setColor(EVENT_COLORS[0]);
      setLocation('');
      setLink('');
      setDescription('');
      setTaskId('');
      setReminder('');
      setWeekdays([]);
      setRepeatWeeks(DEFAULT_REPEAT_VALUE);
    }
  }, [isOpen, event, defaultDate, defaultStartTime]);

  // Alterna um dia da semana no seletor de recorrência.
  const toggleWeekday = (value: number) => {
    setWeekdays(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value].sort((a, b) => a - b),
    );
  };

  // Ao ativar um lembrete, pede permissão e inscreve este dispositivo no Web
  // Push (assim o aviso chega mesmo com o app fechado). Falha silenciosa no iOS
  // fora do PWA — o passo a passo fica no "Fale conosco".
  const handleReminderChange = (value: string) => {
    setReminder(value);
    if (value && pushSupported() && Notification.permission !== 'denied') {
      pushService
        .enable()
        .catch(() => {})
        .finally(() => setPermission(Notification.permission));
    }
  };

  const taskOptions = [
    { value: '', label: 'Nenhuma (sem vínculo)' },
    ...tasks.map(t => ({ value: t.id, label: t.title })),
  ];

  // Ao vincular uma tarefa, se a data estiver vazia, herda o vencimento dela.
  const handleTaskChange = (value: string) => {
    setTaskId(value);
    if (value && !date) {
      const t = tasks.find(task => task.id === value);
      if (t?.dueDate) setDate(t.dueDate);
    }
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Dê um título ao evento.');
      return;
    }
    if (!date) {
      setError('Escolha uma data.');
      return;
    }
    if (!allDay && startTime && endTime && endTime < startTime) {
      setError('O término deve ser depois do início.');
      return;
    }

    const reminderMinutes = reminder === '' ? null : Number(reminder);

    // Monta o payload de um evento para uma data específica. O instante do
    // lembrete (UTC) é recalculado por data — o cliente conhece o fuso; o cron
    // do backend só compara com agora.
    const buildPayload = (eventDate: string) => ({
      title: trimmed,
      description: description.trim() || undefined,
      date: eventDate,
      allDay,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      color,
      location: location.trim() || undefined,
      link: link.trim() || undefined,
      reminderMinutes,
      reminderAt:
        reminderMinutes === null
          ? null
          : reminderTriggerDate({ date: eventDate, startTime, allDay, reminderMinutes })?.toISOString() ??
            null,
      taskId: taskId || null,
    });

    setSaving(true);
    try {
      if (isEditing && event) {
        await updateEvent(event.id, buildPayload(date));
        toast.success('Evento atualizado.');
      } else if (weekdays.length > 0) {
        // Evento rotineiro: cria uma cópia para cada dia da semana escolhido
        // dentro do horizonte de repetição.
        const dates = expandWeekdayDates(date, weekdays, Number(repeatWeeks));
        for (const d of dates) {
          await createEvent(buildPayload(d));
        }
        toast.success(
          dates.length === 1 ? 'Evento criado.' : `${dates.length} eventos criados.`,
        );
      } else {
        await createEvent(buildPayload(date));
        toast.success('Evento criado.');
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível salvar o evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setConfirmDelete(false);
    try {
      await deleteEvent(event.id);
      toast.success('Evento excluído.');
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir o evento.');
    }
  };

  // O contador do "mais opções": o que está definido lá dentro e sumiria de
  // vista com o bloco recolhido.
  const ajustesDefinidos =
    (weekdays.length ? 1 : 0) +
    (reminder ? 1 : 0) +
    (color !== EVENT_COLORS[0] ? 1 : 0) +
    (location.trim() ? 1 : 0) +
    (link.trim() ? 1 : 0) +
    (taskId ? 1 : 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar evento' : 'Novo evento'} size="lg">
      <div className="space-y-5">
        {/* Um bloco de escrita, sem rótulos: o título de um evento é o evento,
            e a descrição é a linha seguinte da mesma anotação. */}
        <div>
          <HeadlineInput
            aria-label="Título do evento"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="O que vai acontecer?"
            maxLength={200}
            autoFocus
          />
          <NoteField
            aria-label="Descrição do evento"
            className="mt-2"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Pauta, observações…"
            maxLength={2000}
          />
        </div>

        {/* A linha do "quando" — a única pergunta que um evento precisa
            responder para existir. Data, horários e dia inteiro na mesma frase
            visual, em vez de quatro campos empilhados. */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
          <DatePicker value={date} onChange={setDate} placeholder="Escolher data" size="sm" />

          {/* Os dois horários e o "até" quebram a linha JUNTOS. Soltos no
              flex de fora, a quebra podia deixar o "até" sozinho no começo da
              linha de baixo, sem o horário a que ele se refere. */}
          {!allDay && (
            <span className="inline-flex items-center gap-2">
              <TimePicker value={startTime} onChange={setStartTime} size="sm" />
              <span className="text-sm text-text-soft">até</span>
              <TimePicker value={endTime} onChange={setEndTime} size="sm" menuAlign="right" />
            </span>
          )}

          {/* O interruptor virou pílula: "dia inteiro" é uma escolha do mesmo
              tipo que as vizinhas, e a linha inteira com moldura e switch
              pesava mais que a data — o dado que de fato importa. */}
          <button
            type="button"
            role="switch"
            aria-checked={allDay}
            onClick={() => setAllDay(v => !v)}
            className={`inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-[13px] font-semibold
              transition-all duration-150 active:scale-[0.96]
              focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
              ${allDay
                ? 'border-primary-vibrant text-primary-vibrant bg-primary-light'
                : 'border-border text-text-secondary hover:border-text-soft hover:bg-bg-secondary'}`}
          >
            <Sun size={14} />
            Dia inteiro
          </button>
        </div>

        {/* Na EDIÇÃO o bloco já começa aberto: os campos avançados costumam ter
            valor, e escondê-los faria parecer que o evento os perdeu. */}
        <MoreOptions key={event?.id ?? 'novo'} activeCount={ajustesDefinidos} defaultOpen={isEditing}>
        {/* Repetir nos dias da semana (só na criação; edição mexe num único evento) */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
              <Repeat size={15} className="text-text-secondary" /> Repetir nos dias
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map(d => {
                const selected = weekdays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekday(d.value)}
                    aria-pressed={selected}
                    aria-label={d.label}
                    title={d.label}
                    className={`w-9 h-9 rounded-full text-sm font-semibold transition-all active:scale-90 ${
                      selected
                        ? 'bg-primary-vibrant text-white shadow'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            {weekdays.length > 0 && (
              <div className="mt-3">
                <Dropdown
                  options={REPEAT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  value={repeatWeeks}
                  onChange={setRepeatWeeks}
                  fullWidth
                />
                <p className="mt-1.5 text-xs text-text-secondary">
                  O evento será criado em cada dia escolhido, a partir da data acima.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lembrete */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
            <Bell size={15} className="text-text-secondary" /> Lembrete
          </label>
          <Dropdown
            options={REMINDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            value={reminder}
            onChange={handleReminderChange}
            placeholder="Sem lembrete"
            fullWidth
          />
          {reminder && allDay && (
            <p className="mt-1.5 text-xs text-text-secondary">
              Eventos de dia inteiro são lembrados a partir das 09:00.
            </p>
          )}
          {reminder && permission === 'denied' && (
            <p className="mt-1.5 text-xs text-danger">
              As notificações do navegador estão bloqueadas — o lembrete só aparecerá no sino. Libere
              nas configurações do navegador para receber alertas.
            </p>
          )}
          {reminder && permission === 'default' && (
            <p className="mt-1.5 text-xs text-text-secondary">
              Permita as notificações para receber o alerta também fora do app.
            </p>
          )}
        </div>

        {/* Cor */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Cor</label>
          <div className="flex flex-wrap gap-2.5">
            {EVENT_COLORS.map(c => {
              const selected = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                    selected ? 'ring-2 ring-offset-2 ring-offset-white ring-primary-dark/40' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selected && <Check size={16} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Local (opcional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Ex.: Sala 3"
          maxLength={200}
          icon={<MapPin size={18} />}
        />

        <Input
          label="Link (opcional)"
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="Ex.: link da chamada ou site"
          maxLength={500}
          icon={<Link2 size={18} />}
        />

        {/* Vínculo com tarefa */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
            <Link2 size={15} className="text-text-secondary" /> Vincular a uma tarefa (opcional)
          </label>
          <Dropdown
            options={taskOptions}
            value={taskId}
            onChange={handleTaskChange}
            placeholder="Nenhuma (sem vínculo)"
            fullWidth
          />
        </div>
        </MoreOptions>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              icon={<Trash2 size={16} />}
              className="text-danger hover:bg-rose-50 rounded-xl"
            >
              Excluir
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} isLoading={saving} className="rounded-xl">
              {isEditing ? 'Salvar' : 'Criar evento'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir evento?"
        message={`"${event?.title ?? ''}" será removido da sua agenda. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<AlertTriangle size={22} />}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Modal>
  );
};
