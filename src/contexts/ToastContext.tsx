import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  /** Mostra um toast. Retorna o id (para remoção manual, se necessário). */
  show: (message: string, type?: ToastType) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  info: (message: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

export const useToast = () => useContext(ToastContext);

const DURATION = 4000;

const config: Record<ToastType, { icon: React.ReactNode; accent: string; ring: string }> = {
  success: { icon: <CheckCircle2 size={20} />, accent: 'text-emerald-600', ring: 'border-emerald-200' },
  error: { icon: <AlertCircle size={20} />, accent: 'text-danger', ring: 'border-rose-200' },
  info: { icon: <Info size={20} />, accent: 'text-primary-vibrant', ring: 'border-primary-light' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++counter.current;
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), DURATION);
      return id;
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: useCallback((m: string) => show(m, 'success'), [show]),
    error: useCallback((m: string) => show(m, 'error'), [show]),
    info: useCallback((m: string) => show(m, 'info'), [show]),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
          <AnimatePresence initial={false}>
            {toasts.map(toast => {
              const c = config[toast.type];
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${c.ring} bg-white shadow-lg px-4 py-3`}
                >
                  <span className={`shrink-0 mt-0.5 ${c.accent}`}>{c.icon}</span>
                  <p className="flex-1 text-sm font-medium text-text-primary leading-snug">
                    {toast.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Fechar"
                    className="shrink-0 -mr-1 p-1 rounded-lg text-text-soft hover:bg-bg-secondary transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
