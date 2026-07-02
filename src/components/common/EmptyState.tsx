import React from 'react';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { Card } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
  mascotState?: MascotState;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  mascotState = 'confused',
  title,
  description,
  action,
}) => {
  return (
    <Card className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-white to-primary-light/30">
      <Mascot state={mascotState} size="lg" animate={true} />

      <div className="text-center mt-6 max-w-md">
        <h3 className="text-2xl font-bold text-text-primary mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-text-secondary mb-6">
            {description}
          </p>
        )}

        {action && (
          <Button onClick={action.onClick} className="px-6">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
};
