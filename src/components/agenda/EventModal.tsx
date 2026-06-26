import React, { useEffect, useState } from 'react';
import { Trash2, MapPin, Link2, Check, AlertTriangle, Bell } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
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
  const [description, setDescription] = useState('');
  const [taskId, setTaskId] = useState('');
  const [reminder, setReminder] = useState(''); // '' = sem lembrete; senão minutos

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
      setDescription(event.description ?? '');
      setTaskId(event.taskId ?? '');
      setReminder(
        event.reminderMinutes !== null && event.reminderMinutes !== undefined
          ? String(event.reminderMinutes)
          : '',
      );
    } else {
      setTitle('');
      setDate(defaultDate ?? '');
      setAllDay(false);
      setStartTime('09:00');
      setEndTime('10:00');
      setColor(EVENT_COLORS[0]);
      setLocation('');
      setDescription('');
      setTaskId('');
      setReminder('');
    }
  }, [isOpen, event, defaultDate]);

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
    // Instante absoluto (UTC) do lembrete — o cliente conhece o fuso; o cron do
    // backend só compara com agora.
    const reminderAt =
      reminderMinutes === null
        ? null
        : reminderTriggerDate({ date, startTime, allDay, reminderMinutes })?.toISOString() ?? null;

    const payload = {
      title: trimmed,
      description: description.trim() || undefined,
      date,
      allDay,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      color,
      location: location.trim() || undefined,
      reminderMinutes,
      reminderAt,
      taskId: taskId || null,
    };

    setSaving(true);
    try {
      if (isEditing && event) {
        await updateEvent(event.id, payload);
        toast.success('Evento atualizado.');
      } else {
        await createEvent(payload);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar evento' : 'Novo evento'} size="lg">
      <div className="space-y-5">
        <Input
          label="Título"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          placeholder="Ex.: Reunião com o cliente"
          maxLength={200}
          autoFocus
        />

        <DatePicker label="Data" value={date} onChange={setDate} />

        {/* Dia inteiro */}
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
          <span className="text-sm font-medium text-text-primary">Dia inteiro</span>
          <button
            type="button"
            role="switch"
            aria-checked={allDay}
            onClick={() => setAllDay(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              allDay ? 'bg-primary-vibrant' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                allDay ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Início" value={startTime} onChange={setStartTime} />
            <TimePicker label="Término" value={endTime} onChange={setEndTime} menuAlign="right" />
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
          placeholder="Ex.: Sala 3 ou link da chamada"
          maxLength={200}
          icon={<MapPin size={18} />}
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

        <Textarea
          label="Descrição (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalhes, pauta, observações…"
          rows={3}
          maxLength={2000}
        />

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
