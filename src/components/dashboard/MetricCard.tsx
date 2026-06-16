import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/common/Card';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  // Variação vs semana passada: percent pode ser negativo; good = cor verde.
  comparison?: {
    percent: number;
    good: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  comparison,
}) => {
  return (
    <Card hoverable className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + '1A', color }}
        >
          {icon}
        </div>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <h3 className="text-4xl font-extrabold text-text-primary leading-none tracking-tight">
          {value}
        </h3>
      </div>

      {comparison && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {comparison.percent === 0 ? (
            <span className="text-xs font-semibold text-text-soft">0%</span>
          ) : (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                comparison.good ? 'text-success' : 'text-danger'
              }`}
            >
              {comparison.percent > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(comparison.percent)}%
            </span>
          )}
          <span className="text-xs text-text-secondary">vs semana passada</span>
        </div>
      )}
    </Card>
  );
};
