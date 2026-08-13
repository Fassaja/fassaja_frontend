import React from 'react';
import { motion } from 'framer-motion';

interface SlidingHighlightProps {
  /**
   * Identificador do GRUPO de botões. Todos os botões do mesmo controle
   * segmentado usam o mesmo valor, e é isso que faz a pílula deslizar de um
   * para o outro em vez de sumir e reaparecer.
   *
   * Precisa ser único na página: dois grupos com o mesmo id fariam a pílula
   * voar de um controle para o outro.
   */
  groupId: string;
  className?: string;
}

/**
 * Fundo que desliza até o item ativo de um controle segmentado.
 *
 * É o `layoutId` do framer-motion: quando o elemento desmonta em um botão e
 * monta em outro com o MESMO layoutId, o framer entende que é o mesmo objeto e
 * interpola posição e tamanho entre os dois lugares.
 *
 * Uso — o botão precisa ser `relative`, e o conteúdo, empilhado acima:
 *
 *   <button className="relative ...">
 *     {ativo && <SlidingHighlight groupId="visao-agenda" />}
 *     <span className="relative z-10">Semana</span>
 *   </button>
 *
 * Renderizar só quando ativo é proposital: é a montagem/desmontagem que dá ao
 * framer os dois pontos a interpolar.
 *
 * Respeita "reduzir movimento" pelo MotionConfig do App — lá a pílula troca de
 * posição sem percorrer o caminho.
 */
export const SlidingHighlight: React.FC<SlidingHighlightProps> = ({
  groupId,
  className = 'bg-surface shadow-sm',
}) => (
  <motion.span
    layoutId={groupId}
    aria-hidden="true"
    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
    className={`absolute inset-0 rounded-lg ${className}`}
  />
);
