import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type AnimationType = 'scale' | 'slide' | 'fade' | 'bounce';

export interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** @default "scale" */
  animation?: AnimationType;
  /** Espaçamento e layout ficam por aqui, com as classes do projeto. */
  className?: string;
}

function variantsOf(type: AnimationType) {
  switch (type) {
    case 'slide':
      return {
        initial: { opacity: 0, y: -30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      };
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    case 'bounce':
      return {
        initial: { opacity: 0, y: -20, scale: 0.8 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
      };
    case 'scale':
    default:
      return {
        initial: { opacity: 0, y: -20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
      };
  }
}

/**
 * Lista que anima a entrada, a saída e a reordenação dos itens.
 *
 * Duas escolhas que valem registro:
 *
 * `layout="position"` em vez de `layout`. O layout completo interpola também a
 * ALTURA do item, e durante essa interpolação o conteúdo é esticado — num card
 * com texto isso aparece como uma distorção feia por alguns quadros. Animar só
 * a posição elimina o problema e ainda é mais barato.
 *
 * `mode="popLayout"` tira o item que está saindo do fluxo, para que os de
 * baixo já subam enquanto ele desaparece — sem isso a lista dá um pulo seco no
 * fim da animação.
 *
 * Não existe `maxVisible` de propósito: numa lista de tarefas, cortar itens
 * silenciosamente esconderia trabalho do usuário. Quem precisa paginar deve
 * fatiar `items` e mostrar um controle explícito.
 *
 * A animação respeita "reduzir movimento" pelo MotionConfig do App.
 */
export function AnimatedList<T extends { id: string | number }>({
  items,
  renderItem,
  animation = 'scale',
  className = '',
}: AnimatedListProps<T>) {
  const variants = variantsOf(animation);

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout="position"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 28,
              layout: { type: 'spring', stiffness: 350, damping: 28 },
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
