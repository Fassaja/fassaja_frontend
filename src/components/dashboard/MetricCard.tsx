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
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-text-secondary text-sm font-medium mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-text-primary mb-2">{value}</h3>
        {comparison && (
          <div className="flex items-center gap-1">
            {comparison.isPositive ? (
              <TrendingUp size={16} className="text-success" />
            ) : (
              <TrendingDown size={16} className="text-danger" />
            )}
            <span className={`text-xs font-medium ${comparison.isPositive ? 'text-success' : 'text-danger'}`}>
              {comparison.isPositive ? '+' : ''}{comparison.value}% vs {comparison.period}
            </span>
          </div>
        )}
      </div>
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center`}
        style={{ backgroundColor: color + '20' }}
      >
        <div style={{ color }}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
