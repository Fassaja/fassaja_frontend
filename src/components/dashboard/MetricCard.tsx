import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/common/Card';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  comparison?: {
    value: number;
    isPositive: boolean;
    period: string;
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
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              comparison.isPositive ? 'text-success' : 'text-danger'
            }`}
          >
            {comparison.isPositive ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {comparison.value}%
          </span>
          <span className="text-xs text-text-secondary">vs {comparison.period}</span>
        </div>
      )}
    </Card>
  );
};
