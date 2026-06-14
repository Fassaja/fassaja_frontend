import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/common/Card';
import { Dropdown } from '@/components/common/Dropdown';
import { Task } from '@/types/task';

interface WeeklyOverviewChartProps {
  tasks: Task[];
}

// Semana começando na segunda-feira.
const WEEK = [
  { key: 1, label: 'Seg' },
  { key: 2, label: 'Ter' },
  { key: 3, label: 'Qua' },
  { key: 4, label: 'Qui' },
  { key: 5, label: 'Sex' },
  { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
];

export const WeeklyOverviewChart: React.FC<WeeklyOverviewChartProps> = ({ tasks }) => {
  const [period, setPeriod] = useState('week');
  const data = useMemo(() => {
    const created: Record<number, number> = {};
    const completed: Record<number, number> = {};

    tasks.forEach(task => {
      const c = new Date(task.createdAt).getDay();
      created[c] = (created[c] ?? 0) + 1;
      if (task.completedAt) {
        const d = new Date(task.completedAt).getDay();
        completed[d] = (completed[d] ?? 0) + 1;
      }
    });

    // Acumulado ao longo da semana, para uma curva de evolução suave.
    let accCreated = 0;
    let accCompleted = 0;
    return WEEK.map(({ key, label }) => {
      accCreated += created[key] ?? 0;
      accCompleted += completed[key] ?? 0;
      return { day: label, criadas: accCreated, concluidas: accCompleted };
    });
  }, [tasks]);

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">Visão Geral</h3>
        <Dropdown
          options={[
            { value: 'week', label: 'Esta semana' },
            { value: 'month', label: 'Este mês' },
          ]}
          value={period}
          onChange={setPeriod}
          size="sm"
          menuAlign="right"
        />
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fillConcluidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2477FF" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2477FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EDF2F7" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: '#E5EAF2' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E5EAF2',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontSize: 13,
            }}
            labelStyle={{ fontWeight: 700, color: '#0F172A' }}
            formatter={(value: number, name: string) => [
              value,
              name === 'concluidas' ? 'Concluídas' : 'Criadas',
            ]}
          />
          <Area
            type="monotone"
            dataKey="criadas"
            stroke="#CBD5E1"
            strokeWidth={2.5}
            fill="transparent"
            dot={false}
            activeDot={{ r: 5, fill: '#CBD5E1', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="concluidas"
            stroke="#2477FF"
            strokeWidth={3}
            fill="url(#fillConcluidas)"
            dot={false}
            activeDot={{ r: 6, fill: '#2477FF', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-3">
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-vibrant" /> Concluídas
        </span>
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Criadas
        </span>
      </div>
    </Card>
  );
};
