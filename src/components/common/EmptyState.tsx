import React from 'react';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
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
  /**
   * `plain` tira o mascote e encolhe o bloco.
   *
   * Nem todo vazio é o primeiro contato com a área: "nenhum resultado para
   * este filtro" é um recado operacional que a pessoa vai ler cinco vezes na
   * mesma sessão, e um mascote de 96px acompanhado de animação a cada busca
   * vira ruído. O mascote fica onde ele de fato apresenta alguma coisa.
   */
  variant?: 'mascot' | 'plain';
}

/**
 * O bloco de "não há nada aqui".
 *
 * Era um Card com degradê e um mascote de 192px — quase 400px de altura para
 * dizer uma frase, e o mesmo bloco aparecia em sete telas. Dentro de uma
 * página que já é feita de cartões, ele lia como um cartão encaixado em outro.
 *
 * Agora é uma moldura tracejada sobre o fundo da página: tracejado porque é
 * exatamente o que ele comunica — um espaço reservado, ainda sem conteúdo —,
 * e sobre o fundo porque um vazio não é uma superfície elevada. O mascote caiu
 * para 96px, tamanho em que ele é um sinal da marca e não o assunto da tela.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  mascotState = 'confused',
  title,
  description,
  action,
  secondaryAction,
  variant = 'mascot',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-secondary/40 px-6 text-center ${
        variant === 'plain' ? 'py-10' : 'py-12'
      }`}
    >
      {variant === 'mascot' && <Mascot state={mascotState} size="sm" animate />}

      <div className={`max-w-md ${variant === 'mascot' ? 'mt-4' : ''}`}>
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>

        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</p>
        )}

        {/* mx-auto é obrigatório aqui: o Button é `display:flex`, mas <button>
            é elemento de formulário e continua com largura do conteúdo em vez
            de esticar. Sendo estreito e block-level, ele encosta à esquerda — e
            o `text-center` do pai não o centraliza, porque alinha só conteúdo
            inline. Sem isto, o botão fica torto em TODO estado vazio do app. */}
        {action && (
          <Button onClick={action.onClick} className="mx-auto mt-5 px-5">
            {action.label}
          </Button>
        )}

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="mx-auto mt-3 block min-h-[40px] text-sm font-semibold text-primary-vibrant transition-colors hover:text-primary-hover sm:min-h-0"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
