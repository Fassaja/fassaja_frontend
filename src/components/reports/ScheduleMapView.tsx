import React, { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';

interface ScheduleMapViewProps {
  tasks: Task[];
  projects: Project[];
}

const DAY = 86400000;
const STATUS_COLOR: Record<Task['status'], string> = {
  pending: '#64748B',
  in_progress: '#2477FF',
  completed: '#22C55E',
  overdue: '#F43F5E',
};

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const ScheduleMapView: React.FC<ScheduleMapViewProps> = ({ tasks, projects }) => {
  const scheduled = useMemo(
    () => tasks.filter(t => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)),
    [tasks],
  );
  const undated = tasks.length - scheduled.length;

  const model = useMemo(() => {
    if (scheduled.length === 0) return null;
    const rows = scheduled.map(t => {
      const due = startOfDay(new Date(`${t.dueDate}T00:00:00`));
      const created = startOfDay(new Date(t.createdAt));
      const start = Math.min(created, due);
      return { task: t, start, end: due };
    });
    let min = Math.min(...rows.map(r => r.start));
    let max = Math.max(...rows.map(r => r.end));
    if (max <= min) max = min + DAY;
    // Margem de um dia em cada ponta para a barra não colar na borda.
    min -= DAY;
    max += DAY;
    const span = max - min;

    // Marcas de mês dentro do intervalo.
    const ticks: { label: string; pct: number }[] = [];
    const cursor = new Date(min);
    cursor.setDate(1);
    while (cursor.getTime() <= max) {
      const t = cursor.getTime();
      if (t >= min) {
        ticks.push({
          label: `${MONTHS[cursor.getMonth()]}`,
          pct: ((t - min) / span) * 100,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const todayPct = ((startOfDay(new Date()) - min) / span) * 100;
    return { rows, min, max, span, ticks, todayPct };
  }, [scheduled]);

  const colorOf = (t: Task) => {
    const project = projects.find(p => p.id === t.projectId);
    return project?.color ?? STATUS_COLOR[t.status];
  };

  if (!model) {
    return (
      <Card className="flex flex-col items-center text-center py-12">
        <CalendarRange size={36} className="text-text-soft" />
        <p className="text-text-primary font-semibold mt-3">Sem datas para mapear</p>
        <p className="text-text-secondary text-sm max-w-sm">
          O cronograma posiciona cada tarefa entre a criação e o prazo. Defina datas de vencimento
          nas tarefas para montar a linha do tempo.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-text-secondary mb-5">
        Cada barra vai da <strong className="text-text-primary">criação</strong> até o{' '}
        <strong className="text-text-primary">prazo</strong> da tarefa. A linha azul marca hoje.
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Régua de meses */}
          <div className="relative h-6 ml-44 border-b border-border mb-2">
            {model.ticks.map((tick, i) => (
              <span
                key={i}
                className="absolute top-0 text-[11px] font-semibold text-text-soft -translate-x-1/2"
                style={{ left: `${tick.pct}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          <div className="space-y-2 relative">
            {/* Marcador de hoje — overlay alinhado só à área das barras (após os rótulos) */}
            {model.todayPct >= 0 && model.todayPct <= 100 && (
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none z-10"
                style={{ left: '11rem' }}
                aria-hidden
              >
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary-vibrant/70"
                  style={{ left: `${model.todayPct}%` }}
                />
              </div>
            )}
            {model.rows.map(row => {
              const leftPct = ((row.start - model.min) / model.span) * 100;
              const widthPct = Math.max(((row.end - row.start) / model.span) * 100, 1.5);
              const color = colorOf(row.task);
              return (
                <div key={row.task.id} className="flex items-center gap-0">
                  <div className="w-44 shrink-0 pr-3">
                    <p
                      className={`text-sm truncate ${
                        row.task.status === 'completed' ? 'text-text-soft line-through' : 'text-text-primary'
                      }`}
                      title={row.task.title}
                    >
                      {row.task.title}
                    </p>
                  </div>
                  <div className="relative flex-1 h-7">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md flex items-center gap-1.5 px-2 shadow-sm"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color + '24',
                        border: `1px solid ${color}66`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {undated > 0 && (
        <p className="text-xs text-text-secondary mt-5">
          {undated} tarefa{undated === 1 ? '' : 's'} sem data de vencimento não aparece
          {undated === 1 ? '' : 'm'} no cronograma.
        </p>
      )}
    </Card>
  );
};
