import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  FileText,
  Sparkles,
  Split,
  Users,
  X,
} from 'lucide-react';
import { aiService, AiStatus } from '@/services/aiService';
import { useAuth } from '@/contexts/AuthContext';
import { bobGreeting } from '@/utils/aiAssistant';
import { Notice } from './assistantUi';
import { ReplanPanel } from './ReplanPanel';
import { DistributePanel } from './DistributePanel';
import { BreakdownPanel } from './BreakdownPanel';

type View = 'home' | 'replan' | 'distribute' | 'breakdown';

const views: Record<Exclude<View, 'home'>, { title: string }> = {
  replan: { title: 'Replanejar a semana' },
  distribute: { title: 'Distribuir na equipe' },
  breakdown: { title: 'Quebrar uma tarefa' },
};

const actions: {
  view: Exclude<View, 'home'>;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    view: 'replan',
    label: 'Replanejar minha semana',
    hint: 'Novos prazos para o que está atrasado ou sem data',
    icon: <CalendarClock size={18} />,
  },
  {
    view: 'distribute',
    label: 'Distribuir na equipe',
    hint: 'Um responsável para cada tarefa sem dono',
    icon: <Users size={18} />,
  },
  {
    view: 'breakdown',
    label: 'Quebrar uma tarefa',
    hint: 'Transformar uma tarefa grande em passos',
    icon: <Split size={18} />,
  },
];

/**
 * O Bob, assistente flutuante no canto inferior direito.
 *
 * Reúne as ações de IA que trabalham sobre os dados que o usuário JÁ tem —
 * diferente da tela /ai, que parte de um documento colado. Todas seguem o mesmo
 * contrato: a IA sugere, o usuário marca o que aceita, e só então gravamos.
 *
 * Fica fora do fluxo do layout (portal + fixed) para não empurrar conteúdo, e
 * abaixo do z-index dos modais — abrir uma tarefa continua cobrindo o Bob.
 */
export const BobAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { isGuest, status: authStatus } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('home');
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  // Enquanto uma chamada está no ar, fechar por engano perderia a sugestão.
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);

  const goHome = useCallback(() => setView('home'), []);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  /**
   * Foco entra no painel ao abrir e volta ao lançador ao fechar. Sem isso o
   * painel é um diálogo só no nome: quem usa teclado o abre e continua
   * tabulando pela página atrás dele, sem nunca alcançar as sugestões.
   *
   * O destino do retorno é o lançador via ref, e não o elemento que estava
   * focado antes: o AnimatePresence desmonta e remonta esse botão, então uma
   * referência guardada na abertura aponta para um nó órfão e focá-la não faz
   * nada — o foco cairia no <body>.
   */
  useEffect(() => {
    // Espera o framer-motion montar (entrada ~180ms, saída ~120ms) antes de
    // mover o foco; focar um nó ainda não montado é um no-op silencioso.
    const id = window.setTimeout(
      () => (open ? panelRef.current : launcherRef.current)?.focus(),
      open ? 60 : 200,
    );
    return () => window.clearTimeout(id);
  }, [open]);

  // Status da cota a cada abertura: o número muda a cada uso, inclusive em
  // outra aba, então cachear entre aberturas mostraria um saldo errado.
  useEffect(() => {
    if (!open) return;
    aiService
      .status()
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, [open]);

  // Esc fecha; clique fora fecha. Ambos respeitam o `busy`.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!panelRef.current || !target) return;
      if (panelRef.current.contains(target)) return;
      // O menu do Select sai por PORTAL, fora do painel: sem esta exceção,
      // escolher uma tarefa no dropdown contava como "clique fora" e fechava
      // o Bob inteiro, jogando a sugestão fora antes de gerá-la.
      if (target.closest?.('[role="listbox"]')) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open, close]);

  // Visitante não tem conta — e as ações do Bob escrevem em projetos, equipes e
  // tags, que só existem com login.
  if (isGuest || authStatus !== 'authed') return null;

  const outOfQuota = !!aiStatus?.aiEnabled && aiStatus.remaining <= 0;

  return createPortal(
    <>
      {/* Lançador. Some enquanto o painel está aberto: ele nasce exatamente
          embaixo do painel, então mantê-lo só duplicaria o botão de fechar que
          já existe no cabeçalho. Fechar continua por ali, Esc ou clique fora. */}
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir o assistente"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.92 }}
            className="fixed bottom-6 right-6 z-40 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-vibrant text-white shadow-lg transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-light"
          >
            <Sparkles size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Assistente Bob"
            tabIndex={-1}
            // bottom-6 (e não bottom-24): como o lançador some ao abrir, o
            // painel encosta onde ele estava em vez de deixar um vão vazio.
            className="fixed inset-x-4 bottom-6 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl sm:left-auto sm:right-6 sm:w-[380px]"
          >
            {/* Cabeçalho */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-secondary/60 px-4 py-3">
              {view !== 'home' ? (
                <button
                  type="button"
                  onClick={() => !busy && setView('home')}
                  aria-label="Voltar"
                  className="-ml-1 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white disabled:opacity-40"
                  disabled={busy}
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <img src="/bobparabens.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary">
                  {view === 'home' ? 'Bob, seu assistente' : views[view].title}
                </p>
                {view === 'home' && aiStatus && (
                  <p className="text-[11px] text-text-secondary">
                    {aiStatus.aiEnabled
                      ? `${aiStatus.remaining} de ${aiStatus.limit} usos nesta semana`
                      : 'Modo demonstração'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white disabled:opacity-40"
                disabled={busy}
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo. `scroll-shadow` pinta um degradê nas bordas apenas
                quando há conteúdo fora de vista — sem isso, uma lista longa
                parecia terminar no corte do painel. */}
            <div className="scroll-shadow min-h-0 flex-1 overflow-y-auto p-4">
              {view === 'home' ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-primary">{bobGreeting(aiStatus)}</p>

                  {outOfQuota && (
                    <Notice tone="warn">
                      Sua cota semanal acabou. As ações voltam a funcionar quando os usos mais
                      antigos saírem da janela de 7 dias.
                    </Notice>
                  )}

                  <ul className="space-y-2">
                    {actions.map(action => (
                      <li key={action.view}>
                        <button
                          type="button"
                          onClick={() => setView(action.view)}
                          disabled={outOfQuota}
                          className="flex w-full items-center gap-3 rounded-xl border border-border bg-white p-3 text-left transition-colors hover:border-primary-vibrant/30 hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-white"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-vibrant">
                            {action.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-text-primary">
                              {action.label}
                            </span>
                            <span className="block text-xs text-text-secondary">{action.hint}</span>
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-text-secondary" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/ai');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-primary-vibrant transition-colors hover:bg-primary-light/50"
                  >
                    <FileText size={14} />
                    Criar um projeto a partir de um documento
                  </button>
                </div>
              ) : view === 'replan' ? (
                <ReplanPanel onBusyChange={setBusy} onHome={goHome} />
              ) : view === 'distribute' ? (
                <DistributePanel onBusyChange={setBusy} onHome={goHome} />
              ) : (
                <BreakdownPanel onBusyChange={setBusy} onHome={goHome} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};
