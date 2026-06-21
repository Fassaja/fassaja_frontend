import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

export interface WalkthroughStep {
  image: string;
  title: string;
  text: string;
}

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: WalkthroughStep[];
}

/**
 * Tutorial em formato de slideshow (passos com mascote, bolinhas de progresso).
 * Reutilizável: usado tanto pelo tour da plataforma quanto pelo da IA.
 */
export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({
  isOpen,
  onClose,
  title,
  steps,
}) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const close = () => {
    onClose();
    // Volta pro início para a próxima abertura.
    setTimeout(() => setStep(0), 200);
  };

  if (!current) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} size="md">
      <div className="flex flex-col items-center text-center gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.img
              src={current.image}
              alt=""
              className="w-32 h-32 object-contain drop-shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <h3 className="text-lg font-bold text-text-primary">{current.title}</h3>
            <p className="text-sm text-text-secondary max-w-sm">{current.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Bolinhas de progresso */}
        <div className="flex gap-1.5 pt-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Passo ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary-vibrant' : 'w-2 bg-border hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navegação */}
        <div className="flex w-full gap-2 pt-2">
          {step > 0 ? (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
              Anterior
            </Button>
          ) : (
            <Button variant="ghost" className="flex-1" onClick={close}>
              Pular
            </Button>
          )}
          {isLast ? (
            <Button className="flex-1" onClick={close}>
              Começar
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Próximo
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
