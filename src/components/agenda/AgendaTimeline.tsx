import React, { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { CalendarEvent } from '@/types/event';
import { tint, chipText } from '@/utils/color';
import { toISODate } from '@/utils/date';
import { toMinutes, startOfWeek, packOverlaps } from '@/utils/agendaTimeline';

export type TimelineView = 'week' | 'day';

interface AgendaTimelineProps {
  view: TimelineView;
  /** Dia âncora: define o dia exibido, ou a semana que o contém. */
  date: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  /** Clique numa faixa vazia: cria um evento já naquele dia e horário. */
  onCreateAt: (iso: string, startTime: string) => void;
}

/** Altura de uma hora, em px. É o que converte tempo em posição na tela. */
const HOUR_H = 48;
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Evento com horário já resolvido em minutos e posicionado na grade. */
type Positioned = ReturnType<typeof packOverlaps<{ event: CalendarEvent; start: number; end: number }>>[number];

export const AgendaTimeline: React.FC<AgendaTimelineProps> = ({
  view,
  date,
  events,
  onSelectDate,
  onOpenEvent,
  onCreateAt,
}) => {
  const days = useMemo(() => {
    if (view === 'day') return [new Date(date.getFullYear(), date.getMonth(), date.getDate())];
    const first = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [view, date]);

  const dayISOs = useMemo(() => days.map(toISODate), [days]);

  // Separa o que tem horário (vai para a grade) do que não tem (faixa do topo).
  const { timed, untimed } = useMemo(() => {
    const timedMap = new Map<string, Positioned[]>();
    const untimedMap = new Map<string, CalendarEvent[]>();
    dayISOs.forEach(iso => {
      timedMap.set(iso, []);
      untimedMap.set(iso, []);
    });

    const raw = new Map<string, { event: CalendarEvent; start: number; end: number }[]>();
    dayISOs.forEach(iso => raw.set(iso, []));

    events.forEach(e => {
      const bucket = raw.get(e.date);
      if (!bucket) return; // fora da janela exibida
      const start = e.allDay ? null : toMinutes(e.startTime);
      if (start === null) {
        untimedMap.get(e.date)!.push(e);
        return;
      }
      // Sem fim declarado, assume 1h — é o padrão do formulário de criação.
      const rawEnd = toMinutes(e.endTime);
      const end = rawEnd !== null && rawEnd > start ? rawEnd : start + 60;
      bucket.push({ event: e, start, end });
    });

    raw.forEach((items, iso) => timedMap.set(iso, packOverlaps(items)));
    return { timed: timedMap, untimed: untimedMap };
  }, [events, dayISOs]);

  /**
   * Janela de horas exibida. Fixa em 7h–20h por padrão, mas esticada para caber
   * o que existir fora disso: uma grade que corta um compromisso das 6h é pior
   * do que uma grade mais alta.
   */
  const [startHour, endHour] = useMemo(() => {
    let min = 7;
    let max = 20;
    timed.forEach(items =>
      items.forEach(({ start, end }) => {
        min = Math.min(min, Math.floor(start / 60));
        max = Math.max(max, Math.ceil(end / 60));
      }),
    );
    return [Math.max(0, min), Math.min(24, Math.max(max, min + 1))];
  }, [timed]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour],
  );
  const gridStart = startHour * 60;
  const gridHeight = (endHour - startHour) * HOUR_H;

  const todayISO = toISODate(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowVisible = nowMinutes >= gridStart && nowMinutes <= endHour * 60;

  const hasUntimed = dayISOs.some(iso => (untimed.get(iso) ?? []).length > 0);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Cabeçalho dos dias */}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((d, i) => {
          const iso = dayISOs[i];
          const isToday = iso === todayISO;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(d)}
              className="py-2 text-center border-l border-border hover:bg-bg-secondary transition-colors"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {WEEK_DAYS[d.getDay()]}
              </span>
              <span
                className={`mt-0.5 mx-auto flex items-center justify-center text-sm font-bold ${
                  isToday
                    ? 'w-7 h-7 rounded-full bg-primary-vibrant text-white'
                    : 'text-text-primary'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Faixa de dia inteiro / sem horário — só aparece quando há algo nela. */}
      {hasUntimed && (
        <div
          className="grid border-b border-border bg-bg-secondary/50"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase text-text-soft">
            Dia
          </div>
          {dayISOs.map(iso => (
            <div key={iso} className="border-l border-border p-1 space-y-1">
              {(untimed.get(iso) ?? []).map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpenEvent(e)}
                  title={e.title}
                  className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold"
                  style={{ backgroundColor: tint(e.color, 'strong'), color: chipText(e.color) }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grade de horas */}
      <div className="max-h-[32rem] overflow-y-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {/* Régua de horas */}
          <div style={{ height: gridHeight }}>
            {hours.map(h => (
              <div
                key={h}
                style={{ height: HOUR_H }}
                className="relative pr-2 text-right text-[11px] font-medium text-text-soft"
              >
                {/* Deslocado para cima: o rótulo marca a LINHA da hora, não a faixa. */}
                <span className="absolute right-2 -top-1.5 bg-surface px-0.5">
                  {String(h).padStart(2, '0')}h
                </span>
              </div>
            ))}
          </div>

          {days.map((d, i) => {
            const iso = dayISOs[i];
            const items = timed.get(iso) ?? [];
            return (
              <div
                key={iso}
                className="relative border-l border-border"
                style={{ height: gridHeight }}
              >
                {/* Faixas clicáveis de uma hora: clicar cria um evento no horário. */}
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onCreateAt(iso, `${String(h).padStart(2, '0')}:00`)}
                    aria-label={`Novo evento em ${d.toLocaleDateString('pt-BR')} às ${h}h`}
                    style={{ height: HOUR_H }}
                    className="block w-full border-t border-border/60 hover:bg-primary-light/60 transition-colors"
                  />
                ))}

                {/* Linha do agora — só no dia de hoje e dentro da janela visível. */}
                {iso === todayISO && nowVisible && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: ((nowMinutes - gridStart) / 60) * HOUR_H }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}

                {items.map(({ event, start, end, col, cols }) => {
                  const top = ((start - gridStart) / 60) * HOUR_H;
                  const height = Math.max(18, ((end - start) / 60) * HOUR_H - 2);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      title={`${event.startTime ?? ''} ${event.title}`}
                      className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left leading-tight shadow-sm hover:brightness-95 active:scale-[0.98] transition-all"
                      style={{
                        top,
                        height,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                        backgroundColor: tint(event.color, 'strong'),
                        color: chipText(event.color),
                        borderLeft: `3px solid ${event.color}`,
                      }}
                    >
                      <span className="block truncate text-[11px] font-bold">{event.title}</span>
                      {height > 30 && event.startTime && (
                        <span className="block truncate text-[10px] opacity-80">
                          {event.startTime}
                          {event.endTime ? ` – ${event.endTime}` : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
