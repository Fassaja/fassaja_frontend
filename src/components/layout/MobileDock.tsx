import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  CheckSquare,
  Plus,
  Timer,
  LayoutGrid,
  CalendarClock,
  CalendarDays,
  FolderKanban,
  Flag,
  Lightbulb,
  Users,
  BarChart3,
  Sparkles,
  UserCircle2,
  Settings,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * A dock do celular: Início · Tarefas · [+] · Agenda · Mais.
 *
 * É o sinal mais forte de "isto é um app, não um site": a navegação
 * principal está no polegar, e a ação principal (nova tarefa) é o botão
 * maior, no centro. O "Mais" abre um painel que SOBE da própria dock com
 * o resto dos destinos — não a gaveta lateral de site.
 *
 * Comportamento que faz diferença no dedo:
 * - a pílula do item ativo DESLIZA entre os ícones (layoutId);
 * - o ícone tocado afunda e o aparelho vibra 8 ms (só Android);
 * - some ao rolar para baixo e volta ao rolar para cima.
 *
 * Só no celular (`lg:hidden`); no desktop a barra lateral segue.
 */
interface Destino {
  path: string;
  rotulo: string;
  Icone: LucideIcon;
  exigeConta?: boolean;
}

const ESQUERDA: Destino[] = [
  { path: '/', rotulo: 'Início', Icone: Home },
  { path: '/tasks', rotulo: 'Tarefas', Icone: CheckSquare },
];
const DIREITA: Destino[] = [{ path: '/agenda', rotulo: 'Agenda', Icone: CalendarClock, exigeConta: true }];

/** O que fica no "Mais": tudo o que não coube na dock, em blocos. */
const MAIS: Destino[] = [
  { path: '/focus', rotulo: 'Foco', Icone: Timer, exigeConta: true },
  { path: '/calendar', rotulo: 'Calendário', Icone: CalendarDays, exigeConta: true },
  { path: '/projects', rotulo: 'Projetos', Icone: FolderKanban, exigeConta: true },
  { path: '/priorities', rotulo: 'Prioridades', Icone: Flag, exigeConta: true },
  { path: '/ideas', rotulo: 'Ideias', Icone: Lightbulb, exigeConta: true },
  { path: '/team', rotulo: 'Equipe', Icone: Users, exigeConta: true },
  { path: '/reports', rotulo: 'Relatórios', Icone: BarChart3, exigeConta: true },
  { path: '/ai', rotulo: 'Assistente', Icone: Sparkles, exigeConta: true },
];
const CONTA: Destino[] = [
  { path: '/profile', rotulo: 'Perfil', Icone: UserCircle2 },
  { path: '/settings', rotulo: 'Ajustes', Icone: Settings },
];

export function vibrar(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem vibração: iOS e desktop */
  }
}

/** Esconde ao rolar para baixo, mostra ao rolar para cima (com folga, para não tremer). */
function useEscondeAoRolar(): boolean {
  const [escondida, setEscondida] = useState(false);
  const ultimoY = useRef(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - ultimoY.current;
        if (y < 40) setEscondida(false);
        else if (delta > 12) setEscondida(true);
        else if (delta < -12) setEscondida(false);
        ultimoY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return escondida;
}

const Item: React.FC<{
  on: boolean;
  rotulo: string;
  Icone: LucideIcon;
  onClick: () => void;
  /** Só o "Mais": vira o ícone quando o painel está aberto. */
  expanded?: boolean;
}> = ({ on, rotulo, Icone, onClick, expanded }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.88 }}
    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
    aria-current={on && expanded === undefined ? 'page' : undefined}
    aria-expanded={expanded}
    aria-label={rotulo}
    className="relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10.5px] font-semibold select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-vibrant/60"
  >
    {on && (
      <motion.span
        layoutId="dock-pilula"
        className="absolute inset-x-1 top-0.5 h-8 rounded-full bg-primary-light"
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />
    )}
    <motion.span
      animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1, rotate: expanded ? 90 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`relative z-10 flex h-7 items-center ${on ? 'text-primary-vibrant' : 'text-text-secondary'}`}
    >
      <Icone size={22} strokeWidth={on ? 2.4 : 2} />
    </motion.span>
    <span className={`relative z-10 ${on ? 'text-primary-vibrant' : 'text-text-soft'}`}>{rotulo}</span>
  </motion.button>
);

export const MobileDock: React.FC<{ onNewTask?: () => void }> = ({ onNewTask }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mobileOpen: maisAberto, setMobileOpen: setMaisAberto } = useSidebar();
  const { status, logout } = useAuth();
  const escondida = useEscondeAoRolar();
  useBodyScrollLock(maisAberto);

  const logado = status === 'authed';
  const ativo = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));
  const algumPrincipalAtivo = [...ESQUERDA, ...DIREITA].some(i => ativo(i.path));

  // Fecha o "Mais" ao trocar de tela — inclusive pelo botão voltar.
  useEffect(() => {
    setMaisAberto(false);
  }, [pathname, setMaisAberto]);

  const ir = (d: Destino) => {
    vibrar(8);
    setMaisAberto(false);
    const destino = d.exigeConta && !logado ? '/login' : d.path;
    if (pathname !== destino) navigate(destino);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const novaTarefa = () => {
    vibrar(12);
    setMaisAberto(false);
    if (onNewTask) onNewTask();
    else navigate('/tasks');
  };

  return (
    <>
      {/* O painel do "Mais": sobe da dock, com o resto dos destinos em blocos. */}
      <AnimatePresence>
        {maisAberto && (
          <>
            <motion.div
              key="fundo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMaisAberto(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.section
              key="painel"
              role="dialog"
              aria-label="Mais opções"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-[1.75rem] border border-border/70 bg-surface p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] lg:hidden"
              style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary">Mais</h2>
                <button
                  type="button"
                  onClick={() => setMaisAberto(false)}
                  aria-label="Fechar"
                  className="rounded-lg p-1 text-text-soft hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>
              <ul className="grid grid-cols-4 gap-2">
                {MAIS.map(d => (
                  <li key={d.path}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => ir(d)}
                      className={`flex w-full flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-medium ${
                        ativo(d.path) ? 'bg-primary-light text-primary-vibrant' : 'bg-bg-secondary text-text-primary'
                      }`}
                    >
                      <d.Icone size={22} />
                      <span className="leading-tight text-center">{d.rotulo}</span>
                    </motion.button>
                  </li>
                ))}
              </ul>
              {logado && (
                <ul className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                  {CONTA.map(d => (
                    <li key={d.path}>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => ir(d)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-bg-secondary px-2 py-2.5 text-xs font-medium text-text-primary"
                      >
                        <d.Icone size={16} /> {d.rotulo}
                      </motion.button>
                    </li>
                  ))}
                  <li>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        setMaisAberto(false);
                        logout();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-bg-secondary px-2 py-2.5 text-xs font-medium text-danger"
                    >
                      <LogOut size={16} /> Sair
                    </motion.button>
                  </li>
                </ul>
              )}
            </motion.section>
          </>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label="Navegação principal"
        initial={false}
        animate={{ y: escondida && !maisAberto ? 110 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden px-3"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-md rounded-[1.75rem] border border-border/70 bg-surface/85 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <ul className="flex items-end justify-between px-1.5 py-1.5">
            {ESQUERDA.map(d => (
              <li key={d.path} className="flex-1">
                <Item on={ativo(d.path)} rotulo={d.rotulo} Icone={d.Icone} onClick={() => ir(d)} />
              </li>
            ))}
            {/* O "+": maior, saltado para cima, na cor da marca. É a ação
                principal do app, então é o botão mais fácil de acertar. */}
            <li className="flex flex-1 justify-center">
              <motion.button
                type="button"
                onClick={novaTarefa}
                whileTap={{ scale: 0.9, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                aria-label="Nova tarefa"
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-vibrant text-white shadow-lg shadow-primary-vibrant/40 ring-4 ring-bg-main focus:outline-none focus-visible:ring-primary-vibrant/60"
              >
                <Plus size={28} strokeWidth={2.6} />
              </motion.button>
            </li>
            {DIREITA.map(d => (
              <li key={d.path} className="flex-1">
                <Item on={ativo(d.path)} rotulo={d.rotulo} Icone={d.Icone} onClick={() => ir(d)} />
              </li>
            ))}
            <li className="flex-1">
              <Item
                on={maisAberto || !algumPrincipalAtivo}
                expanded={maisAberto}
                rotulo="Mais"
                Icone={LayoutGrid}
                onClick={() => {
                  vibrar(8);
                  setMaisAberto(!maisAberto);
                }}
              />
            </li>
          </ul>
        </div>
      </motion.nav>
    </>
  );
};
