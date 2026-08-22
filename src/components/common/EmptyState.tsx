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
  /**
   * Um segundo caminho, em texto e sem peso de botão.
   *
   * A tela vazia é onde a pessoa está mais disposta a experimentar outra
   * forma de começar — mas dois botões lado a lado dividiriam a atenção e
   * nenhum seria "o" próximo passo. Este fica abaixo, como alternativa.
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  mascotState = 'confused',
  title,
  description,
  action,
  secondaryAction,
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

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="mt-3 mx-auto block text-sm font-semibold text-primary-vibrant hover:text-primary-hover transition-colors min-h-[40px] sm:min-h-0"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </Card>
  );
};
