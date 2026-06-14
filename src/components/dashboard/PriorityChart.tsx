import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/common/Card';
import { Task } from '@/types/task';

interface PriorityChartProps {
  tasks: Task[];
}

const SEGMENTS = [
  { key: 'high', label: 'Alta', color: '#8B5CF6' },
  { key: 'medium', label: 'Média', color: '#FBBF24' },
  { key: 'low', label: 'Baixa', color: '#22C55E' },
] as const;

export const PriorityChart: React.FC<PriorityChartProps> = ({ tasks }) => {
  const { data, total } = useMemo(() => {
    const counts = SEGMENTS.map(seg => ({
      ...seg,
      value: tasks.filter(t => t.priority === seg.key).length,
    }));
    return { data: counts, total: tasks.length };
  }, [tasks]);

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const hasData = total > 0;

  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold text-text-primary mb-4">Tarefas por Prioridade</h3>

      <div className="flex items-center gap-4">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasData ? data : [{ label: 'vazio', value: 1, color: '#EDF2F7' }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={68}
                paddingAngle={hasData ? 3 : 0}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {(hasData ? data : [{ color: '#EDF2F7' }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-text-primary leading-none">{total}</span>
            <span className="text-[11px] text-text-secondary">tarefas</span>
          </div>
        </div>

        <ul className="flex-1 space-y-3">
          {data.map(seg => (
            <li key={seg.key} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-text-secondary">{seg.label}</span>
              <span className="ml-auto font-semibold text-text-primary">
                {seg.value} <span className="text-text-soft font-normal">({pct(seg.value)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
