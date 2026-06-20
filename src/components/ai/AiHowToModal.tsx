import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface AiHowToModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  image: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    image: '/bobOla.png',
    title: 'Oi! Eu sou o assistente de IA 🤖',
    text: 'Transformo documentos em projetos com tarefas. Veja em 4 passos.',
  },
  {
    image: '/bobapontando.png',
    title: '1. Envie o conteúdo',
    text: 'Cole um texto, importe ou arraste um PDF, Word, .txt ou .md.',
  },
  {
    image: '/bobinvestigador.png',
    title: '2. Escolha o modo e gere',
    text: '"Estruturar projeto" vira um plano. "Analisar melhorias" sugere o que melhorar. Clique em Gerar.',
  },
  {
    image: '/bobforte.png',
    title: '3. Revise e ajuste',
    text: 'Edite os cards: título, prioridade, data e responsável. Crie um projeto novo ou some a um existente.',
  },
  {
    image: '/bobheroi.png',
    title: '4. Aprove e pronto! 🎉',
    text: 'Aprove e os cards viram tarefas. São 5 usos de IA por semana. Bora!',
  },
];

export const AiHowToModal: React.FC<AiHowToModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = () => {
    onClose();
    // Volta pro início para a próxima abertura.
    setTimeout(() => setStep(0), 200);
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Como usar o Assistente de IA" size="md">
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
          {STEPS.map((_, i) => (
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
