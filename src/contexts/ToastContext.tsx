import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { mola } from '@/components/motion/tokens';

export type ToastType = 'success' | 'error' | 'info';

/** Um botão no próprio aviso — hoje, o "Desfazer". */
export interface AcaoDoAviso {
  rotulo: string;
  onClick: () => void;
  /**
   * Chamado quando o aviso fecha SEM a ação ter sido usada (o tempo acabou ou
   * a pessoa fechou no X). É onde a exclusão adiada de fato acontece: como o
   * relógio do aviso pausa no hover, o "Desfazer" vale enquanto o aviso estiver
   * na tela — nem um segundo a menos.
   */
  aoExpirar?: () => void;
}

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  acao?: AcaoDoAviso;
  /** Duração total, em ms (avisos com ação ficam mais tempo). */
  duracao: number;
}

interface ToastContextValue {
  /** Mostra um toast. Retorna o id (para remoção manual, se necessário). */
  show: (message: string, type?: ToastType) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  info: (message: string) => number;
  dismiss: (id: number) => void;
  /**
   * Aviso com um botão de ação (ex.: "Desfazer"). Fica mais tempo que os
   * outros e pausa enquanto o ponteiro está em cima — dá tempo de ler e
   * alcançar o botão.
   */
  comAcao: (message: string, acao: AcaoDoAviso, type?: ToastType) => number;
}

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

export const useToast = () => useContext(ToastContext);

const DURATION = 4000;
const DURACAO_COM_ACAO = 6000;

const config: Record<ToastType, { icon: React.ReactNode; accent: string; ring: string }> = {
  success: { icon: <CheckCircle2 size={20} />, accent: 'text-sucesso', ring: 'border-sucesso-borda' },
  error: { icon: <AlertCircle size={20} />, accent: 'text-danger', ring: 'border-perigo-borda' },
  info: { icon: <Info size={20} />, accent: 'text-primary-vibrant', ring: 'border-primary-light' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  /**
   * Um relógio por aviso, pausável: guarda quando ele começou a contar e
   * quanto ainda falta. Parar o relógio no hover é o que deixa um "Desfazer"
   * alcançável — sem isso o aviso podia sumir debaixo do ponteiro.
   */
  const relogios = useRef(new Map<number, { timer: number; inicio: number; resta: number }>());

  /** Ações ainda pendentes de cada aviso, para chamar `aoExpirar` ao fechar. */
  const acoes = useRef(new Map<number, AcaoDoAviso>());

  const remover = useCallback((id: number, usouAcao: boolean) => {
    const r = relogios.current.get(id);
    if (r) window.clearTimeout(r.timer);
    relogios.current.delete(id);
    const acao = acoes.current.get(id);
    acoes.current.delete(id);
    if (acao && !usouAcao) acao.aoExpirar?.();
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismiss = useCallback((id: number) => remover(id, false), [remover]);

  const contar = useCallback(
    (id: number, ms: number) => {
      const timer = window.setTimeout(() => dismiss(id), ms);
      relogios.current.set(id, { timer, inicio: Date.now(), resta: ms });
    },
    [dismiss],
  );

  const pausar = useCallback((id: number) => {
    const r = relogios.current.get(id);
    if (!r) return;
    window.clearTimeout(r.timer);
    relogios.current.set(id, { ...r, timer: 0, resta: Math.max(0, r.resta - (Date.now() - r.inicio)) });
  }, []);

  const retomar = useCallback(
    (id: number) => {
      const r = relogios.current.get(id);
      if (!r || r.timer) return;
      contar(id, Math.max(1500, r.resta));
    },
    [contar],
  );

  const adicionar = useCallback(
    (message: string, type: ToastType, acao?: AcaoDoAviso) => {
      const id = ++counter.current;
      const duracao = acao ? DURACAO_COM_ACAO : DURATION;
      if (acao) acoes.current.set(id, acao);
      setToasts(prev => [...prev, { id, type, message, acao, duracao }]);
      contar(id, duracao);
      return id;
    },
    [contar],
  );

  const show = useCallback(
    (message: string, type: ToastType = 'info') => adicionar(message, type),
    [adicionar],
  );

  const value: ToastContextValue = {
    show,
    success: useCallback((m: string) => show(m, 'success'), [show]),
    error: useCallback((m: string) => show(m, 'error'), [show]),
    info: useCallback((m: string) => show(m, 'info'), [show]),
    dismiss,
    comAcao: useCallback(
      (message: string, acao: AcaoDoAviso, type: ToastType = 'success') =>
        adicionar(message, type, acao),
      [adicionar],
    ),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-24 lg:bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
          <AnimatePresence initial={false}>
            {toasts.map(toast => {
              const c = config[toast.type];
              return (
                <m.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={mola.viva}
                  onPointerEnter={() => pausar(toast.id)}
                  onPointerLeave={() => retomar(toast.id)}
                  onFocusCapture={() => pausar(toast.id)}
                  onBlurCapture={() => retomar(toast.id)}
                  // `role="status"` só no aviso com ação: o leitor de tela
                  // precisa saber que existe um "Desfazer" para alcançar.
                  role={toast.acao ? 'status' : undefined}
                  className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border ${c.ring} bg-surface shadow-lg px-4 py-3`}
                >
                  <span className={`shrink-0 mt-0.5 ${c.accent}`}>{c.icon}</span>
                  <p className="flex-1 text-sm font-medium text-text-primary leading-snug">
                    {toast.message}
                  </p>
                  {toast.acao && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.acao?.onClick();
                        remover(toast.id, true);
                      }}
                      className="-my-1 shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold text-primary-vibrant transition-colors hover:bg-primary-light"
                    >
                      {toast.acao.rotulo}
                    </button>
                  )}
                  {/* Quanto tempo ainda resta para desfazer. Anima só
                      `transform` e para junto com o relógio no hover. */}
                  {toast.acao && (
                    <span
                      aria-hidden="true"
                      className="toast-tempo absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary-vibrant/50"
                      style={{ animationDuration: `${toast.duracao}ms` }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Fechar"
                    className="shrink-0 -mr-1 p-1 rounded-lg text-text-soft hover:bg-bg-secondary transition-colors"
                  >
                    <X size={16} />
                  </button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
