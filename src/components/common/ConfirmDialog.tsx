import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  /** Texto de apoio/didático destacado em um quadro abaixo da mensagem. */
  hint?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: React.ReactNode;
  /** Mostra o mascote Bob no topo (ex.: 'confused' = bobduvida). Tem prioridade sobre o ícone. */
  mascotState?: MascotState;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  hint,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon,
  mascotState,
  onConfirm,
  onClose,
}) => {
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Sem backdrop-blur (caro em tela cheia); fade barato no wrapper e
              scale só no painel pequeno — evita queda de FPS ao abrir. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-scrim/70 z-[60]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] overflow-y-auto p-4"
            onClick={onClose}
          >
            {/* Centralizar com `items-center` direto no overlay quebra quando o
                diálogo é mais alto que a tela: ele transborda para os dois
                lados e o topo (título e botões) fica fora do alcance, sem como
                rolar. Com o overlay rolável + este wrapper `min-h-full`, o
                painel centraliza quando cabe e cresce a partir do topo quando
                não cabe. */}
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="bg-surface rounded-2xl shadow-lg max-w-sm w-full p-6 text-center"
                onClick={e => e.stopPropagation()}
              >
                {mascotState ? (
                  <div className="flex justify-center -mt-2 mb-1">
                    <Mascot state={mascotState} size="sm" />
                  </div>
                ) : icon ? (
                  <div
                    className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      tone === 'danger' ? 'bg-rose-100 dark:bg-rose-500/15 text-danger' : 'bg-primary-light text-primary-vibrant'
                    }`}
                  >
                    {icon}
                  </div>
                ) : null}
                <h2 className="text-lg font-bold text-text-primary mb-1.5">{title}</h2>
                <p className="text-sm text-text-secondary whitespace-pre-line">{message}</p>
                {hint && (
                  <div className="mt-4 rounded-2xl bg-bg-secondary/70 border border-border px-4 py-3 text-sm text-text-secondary text-left">
                    {hint}
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1 rounded-xl"
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={tone === 'danger' ? 'danger' : 'primary'}
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-1 rounded-xl"
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
