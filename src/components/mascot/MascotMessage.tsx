import React from 'react';
import { Mascot, MascotState } from './Mascot';
import { Card } from '@/components/common/Card';

interface MascotMessageProps {
  state?: MascotState;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  mascotSize?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const MascotMessage: React.FC<MascotMessageProps> = ({
  state = 'happy',
  title,
  message,
  action,
  mascotSize = 'md',
  centered = true,
}) => {
  return (
    <Card className={centered ? 'flex flex-col items-center text-center py-8' : 'py-8'}>
      <Mascot state={state} size={mascotSize} animate={true} />

      <div className={centered ? 'mt-6 max-w-md' : 'mt-6'}>
        <h3 className="text-xl font-bold text-text-primary mb-2">
          {title}
        </h3>
        <p className="text-text-secondary mb-6">
          {message}
        </p>

        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center justify-center px-6 py-2 bg-primary-vibrant text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </Card>
  );
};
