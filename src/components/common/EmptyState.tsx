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
    <Card className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-surface to-primary-light/30">
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

        {/* mx-auto é obrigatório aqui: o Button é `display:flex`, mas <button>
            é elemento de formulário e continua com largura do conteúdo em vez
            de esticar. Sendo estreito e block-level, ele encosta à esquerda — e
            o `text-center` do pai não o centraliza, porque alinha só conteúdo
            inline. Sem isto, o botão fica torto em TODO estado vazio do app. */}
        {action && (
          <Button onClick={action.onClick} className="px-6 mx-auto">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
};
