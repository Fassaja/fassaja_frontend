import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/common/Card';
import { CountUp } from '@/components/common/CountUp';

interface GoalProgress {
  done: number;
  goal: number;
}

interface ProgressCardProps {
  percentage: number;
  label?: string;
  goals?: { daily: GoalProgress; weekly: GoalProgress };
}

/**
 * Barra de meta. A cor vem por CLASSE do tema (`bg-primary-vibrant`,
 * `bg-priority-high`) e não por hex: os valores fixos que estavam aqui eram os
 * do tema claro e não acompanhavam a troca para o escuro.
 */
const GoalBar: React.FC<{ label: string; done: number; goal: number; barClass: string }> = ({
  label,
  done,
  goal,
  barClass,
}) => {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-xs font-bold text-text-primary">
          {done}/{goal}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden bg-bg-secondary">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
};

export const ProgressCard: React.FC<ProgressCardProps> = ({
  percentage,
  label = 'Concluído',
  goals,
}) => {
  const size = 116;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-lg font-bold text-text-primary mb-3">Progresso geral</h3>

      <div className="flex-1 flex items-center justify-center">
        {/* Donut. As cores saem de `currentColor`/classe para seguir o tema:
            os hex fixos de antes (#EAF2FF, #2477FF) eram do tema claro. */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-primary-light"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-primary-vibrant"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <CountUp
              value={percentage}
              suffix="%"
              durationMs={1000}
              className="text-2xl font-extrabold text-text-primary leading-none"
            />
            <span className="text-[11px] text-text-secondary mt-0.5">{label}</span>
          </div>
        </div>
      </div>

      {goals && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <GoalBar
            label="Meta diária"
            done={goals.daily.done}
            goal={goals.daily.goal}
            barClass="bg-primary-vibrant"
          />
          <GoalBar
            label="Meta semanal"
            done={goals.weekly.done}
            goal={goals.weekly.goal}
            barClass="bg-priority-high"
          />
        </div>
      )}
    </Card>
  );
};
