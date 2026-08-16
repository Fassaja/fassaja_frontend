import React from 'react';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { MonthGrid, DayMarker } from '@/components/common/MonthGrid';
import { tint, chipText } from '@/utils/color';

interface CalendarMonthProps {
  date: Date;
  onDateChange: (date: Date) => void;
  tasks: Task[];
  projects?: Project[];
  activeProject?: string;
  onProjectFilter?: (value: string) => void;
  onSelectDate: (date: Date) => void;
  /** Dia aberto no painel lateral — precisa se ver na grade. */
  selectedDate?: Date;
}

/** Cor dos itens sem projeto, igual na legenda e nos pontos da grade. */
const NO_PROJECT_COLOR = '#94A3B8';

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  date,
  onDateChange,
  tasks,
  projects = [],
  activeProject = 'all',
  onProjectFilter,
  onSelectDate,
  selectedDate,
}) => {
  const projectColor = (projectId?: string) =>
    projects.find(p => p.id === projectId)?.color ?? NO_PROJECT_COLOR;

  /**
   * Um ponto por tarefa que vence no dia. Atrasadas vêm primeiro: quando há
   * mais tarefas do que pontos, a que precisa de atenção é justamente a que
   * não pode cair no "+N".
   */
  const markersFor = (iso: string): DayMarker[] =>
    tasks
      .filter(t => t.dueDate === iso)
      .map(t => ({ color: projectColor(t.projectId), alert: t.status === 'overdue' }))
      .sort((a, b) => Number(!!b.alert) - Number(!!a.alert));

  // Quantas tarefas cada filtro alcança NO MÊS À VISTA. Sem isso, filtrar por
  // um projeto sem prazos neste mês esvazia a grade sem explicar por quê.
  const monthPrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthTasks = tasks.filter(t => t.dueDate?.startsWith(monthPrefix));
  const overdueCount = monthTasks.filter(t => t.status === 'overdue').length;
  const countFor = (value: string) =>
    value === '__none__'
      ? monthTasks.filter(t => !t.projectId).length
      : monthTasks.filter(t => t.projectId === value).length;

  const filters = [
    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color })),
    { value: '__none__', label: 'Sem projeto', color: NO_PROJECT_COLOR },
  ];

  return (
    <MonthGrid
      month={date}
      onMonthChange={onDateChange}
      selectedDate={selectedDate ?? new Date()}
      onSelectDate={onSelectDate}
      markersFor={markersFor}
      noun="tarefa"
      summary={
        monthTasks.length === 0 ? (
          'Nenhum prazo neste mês'
        ) : (
          <>
            {monthTasks.length} {monthTasks.length === 1 ? 'prazo' : 'prazos'} neste mês
            {overdueCount > 0 && (
              <span className="text-danger font-semibold"> · {overdueCount} atrasado{overdueCount === 1 ? '' : 's'}</span>
            )}
          </>
        )
      }
      footer={
        projects.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por projeto">
              {/* "Todos" é um chip como os outros, e não um link que só aparece
                  quando há filtro: assim o estado sem filtro fica visível — dá
                  para ver que nada está escondido sem precisar deduzir. */}
              <button
                type="button"
                onClick={() => onProjectFilter?.('all')}
                aria-pressed={activeProject === 'all'}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                  activeProject === 'all'
                    ? 'border-primary-vibrant bg-primary-light text-primary-vibrant'
                    : 'border-border text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                Todos
              </button>

              {filters.map(item => {
                const active = activeProject === item.value;
                const count = countFor(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onProjectFilter?.(active ? 'all' : item.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                      active ? 'font-semibold' : 'border-border text-text-secondary hover:bg-bg-secondary'
                    } ${count === 0 && !active ? 'opacity-50' : ''}`}
                    // Ativo: fundo tingido com a cor do projeto e texto na mesma
                    // cor legível — o fundo sólido de antes exigia texto branco,
                    // que some sobre projetos de cor clara (amarelo, verde-claro).
                    style={
                      active
                        ? {
                            backgroundColor: tint(item.color, 'medium'),
                            borderColor: tint(item.color, 'strong'),
                            color: chipText(item.color),
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                    <span className={active ? '' : 'text-text-soft'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : undefined
      }
    />
  );
};
