import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface MoreOptionsProps {
  children: React.ReactNode;
  label?: string;
  /** Quantos ajustes o bloco escondido já tem preenchidos (mostrado ao lado). */
  activeCount?: number;
  /**
   * Começa aberto — usado na edição, onde os campos avançados já têm valor.
   *
   * ATENÇÃO: como todo `useState` inicial, é lido UMA vez, na montagem. Os
   * modais deste app não desmontam ao fechar (ficam no DOM, controlados por
   * `isOpen`), então na primeira renderização da página ainda não há tarefa ou
   * evento selecionado e este valor seria `false` para sempre.
   *
   * Quem passa `defaultOpen` variável precisa passar também um `key` com o id
   * do que está sendo editado — é assim que o React reinicia o estado de um
   * componente, e é o que faz o valor ser relido a cada abertura.
   */
  defaultOpen?: boolean;
}

/**
 * O "resto" de um formulário de criação, atrás de um clique.
 *
 * Existe porque criar uma tarefa e configurar uma tarefa são duas coisas
 * diferentes, e mostrar as duas ao mesmo tempo faz a primeira parecer a
 * segunda. Quem digita "comprar material" e aperta Enter não devia ter
 * atravessado oito campos rotulados para chegar lá.
 *
 * `activeCount` evita o preço de esconder: sem ele, um valor definido e depois
 * recolhido some da vista, e a pessoa salva sem lembrar do que tinha escolhido.
 */
export const MoreOptions: React.FC<MoreOptionsProps> = ({
  children,
  label = 'Mais opções',
  activeCount = 0,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  // Enquanto anima, o painel precisa de overflow-hidden para a altura fazer
  // sentido. Depois de aberto ele volta a ser visível, senão qualquer menu
  // ancorado lá dentro (o calendário, que não usa portal) sai cortado.
  const [animating, setAnimating] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setAnimating(true);
          setOpen(v => !v);
        }}
        aria-expanded={open}
        className="flex items-center gap-1.5 -ml-1 px-1 py-1 rounded-lg text-sm font-medium
                   text-text-secondary hover:text-text-primary transition-colors
                   focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
      >
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
        {label}
        {!open && activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary-light text-primary-vibrant text-xs font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setAnimating(false)}
            className={animating ? 'overflow-hidden' : 'overflow-visible'}
          >
            <div className="pt-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
