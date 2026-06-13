import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/common/Card';

interface ProgressCardProps {
  percentage: number;
  label: string;
  message?: string;
  showMascot?: boolean;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  percentage,
  label,
  message,
  showMascot = true,
}) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="flex flex-col items-center justify-center py-8">
      <div className="relative mb-6">
        <svg width="120" height="120" className="transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#E5EAF2"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#2477FF"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="text-3xl font-bold text-text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {percentage}%
            </motion.div>
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
        </div>
      </div>

      {showMascot && (
        <div className="text-6xl mb-4">🎉</div>
      )}

      {message && (
        <p className="text-center text-sm text-text-primary font-medium mt-4">
          {message}
        </p>
      )}
    </Card>
  );
};
