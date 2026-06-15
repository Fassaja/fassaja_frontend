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

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const WeeklyOverviewChart: React.FC<WeeklyOverviewChartProps> = ({ tasks }) => {
  const [period, setPeriod] = useState('week');

  const data = useMemo(() => {
    const now = new Date();

    if (period === 'month') {
      // Mês atual, agrupado por semana do mês (Sem 1, Sem 2, ...).
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const weeks = Math.ceil(daysInMonth / 7);
      const buckets = Array.from({ length: weeks }, (_, i) => ({
        day: `Sem ${i + 1}`,
        criadas: 0,
        concluidas: 0,
      }));
      const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === month;
      tasks.forEach(task => {
        const c = new Date(task.createdAt);
        if (inMonth(c)) buckets[Math.floor((c.getDate() - 1) / 7)].criadas += 1;
        if (task.completedAt) {
          const d = new Date(task.completedAt);
          if (inMonth(d)) buckets[Math.floor((d.getDate() - 1) / 7)].concluidas += 1;
        }
      });
      return buckets;
    }

    // Semana atual (segunda a domingo), por data real.
    const monday = new Date(now);
    const offset = (now.getDay() + 6) % 7; // 0 = segunda
    monday.setDate(now.getDate() - offset);
    monday.setHours(0, 0, 0, 0);

    return WEEK_LABELS.map((label, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      let criadas = 0;
      let concluidas = 0;
      tasks.forEach(task => {
        if (sameDay(new Date(task.createdAt), day)) criadas += 1;
        if (task.completedAt && sameDay(new Date(task.completedAt), day)) concluidas += 1;
      });
      return { day: label, criadas, concluidas };
    });
  }, [tasks, period]);

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
