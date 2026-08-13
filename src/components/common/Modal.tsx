import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  // Para conteúdo em duas colunas (comando de um lado, rascunho do outro).
  // Abaixo de lg: o layout já empilha sozinho, então isto só amplia no desktop.
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {/* Sem backdrop-blur: desfocar a viewport inteira a cada frame do fade
              derruba FPS em GPU integrada. O véu escuro sozinho dá o mesmo foco. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-scrim/75 z-[60]"
          />

          {/* O wrapper de tela cheia só faz fade (barato); o scale/subida fica
              no painel pequeno — transformar uma camada do tamanho da viewport
              a cada frame era a causa do travamento ao abrir. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* max-h no PAINEL + corpo rolável, em vez de altura fixa calculada
                no corpo: some o número mágico (o antigo -200px chutava a altura
                do cabeçalho) e o modal nunca ultrapassa a tela. dvh em vez de
                vh porque no celular a 100vh inclui a área da barra de
                endereço. */}
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={`bg-surface rounded-2xl shadow-lg ${sizeClasses[size]} w-full max-h-[90dvh] flex flex-col`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold text-text-primary">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>

              {/* Content — ocupa o que sobrar do painel e rola sozinho. */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
