import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon,
  onConfirm,
  onClose,
}) => {
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary-dark/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              {icon && (
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                    tone === 'danger' ? 'bg-rose-100 text-danger' : 'bg-primary-light text-primary-vibrant'
                  }`}
                >
                  {icon}
                </div>
              )}
              <h2 className="text-lg font-bold text-text-primary mb-1.5">{title}</h2>
              <p className="text-sm text-text-secondary mb-6">{message}</p>
              <div className="flex gap-3">
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
