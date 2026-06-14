import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/common/Card';
import { Mascot, MascotState } from '@/components/mascot/Mascot';

interface ProgressCardProps {
  percentage: number;
  label?: string;
  headline?: string;
  message?: string;
  mascotState?: MascotState;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  percentage,
  label = 'Concluído',
  headline,
  message,
  mascotState,
}) => {
  const size = 116;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const resolvedState: MascotState =
    mascotState ??
    (percentage >= 75 ? 'strong' : percentage > 0 ? 'happy' : 'confused');

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-lg font-bold text-text-primary mb-3">Progresso geral</h3>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#EAF2FF"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#2477FF"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-text-primary leading-none">
              {percentage}%
            </span>
            <span className="text-[11px] text-text-secondary mt-0.5">{label}</span>
          </div>
        </div>

        {/* Mascot */}
        <Mascot state={resolvedState} size="sm" animate={true} />
      </div>

      {(headline || message) && (
        <div className="text-center mt-1">
          {headline && (
            <p className="text-base font-bold text-primary-vibrant">{headline}</p>
          )}
          {message && (
            <p className="text-sm text-text-secondary mt-0.5">{message}</p>
          )}
        </div>
      )}
    </Card>
  );
};
