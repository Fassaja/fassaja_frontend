import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CompleteCheckProps {
  completed: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * Botão circular de concluir tarefa — o gesto central do Fassaja.
 * No hover mostra um check "fantasma" (prévia do que vai acontecer);
 * ao concluir, o check entra com um pop de mola. A área clicável é
 * maior que o círculo (pseudo-elemento) para toque confortável.
 */
export const CompleteCheck: React.FC<CompleteCheckProps> = ({
  completed,
  onToggle,
  className = '',
}) => (
  <button
    type="button"
    onClick={e => {
      e.stopPropagation();
      onToggle?.();
    }}
    aria-label={completed ? 'Tarefa concluída' : 'Marcar como concluída'}
    className={`group/check relative shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] ${className}`}
  >
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 ${
        completed
          ? 'bg-success text-white'
          : 'border-2 border-border group-hover/check:border-primary-vibrant group-hover/check:bg-primary-light/60 group-hover/check:scale-110'
      }`}
    >
      {completed ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex"
        >
          <Check size={13} strokeWidth={3} />
        </motion.span>
      ) : (
        <Check
          size={11}
          strokeWidth={3}
          className="text-primary-vibrant opacity-0 group-hover/check:opacity-60 transition-opacity duration-150"
        />
      )}
    </span>
  </button>
);
