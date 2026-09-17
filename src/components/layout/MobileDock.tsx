import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, CheckSquare, CalendarClock, Timer, LayoutGrid } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * A dock do celular: cinco destinos na base da tela, como todo app.
 *
 * É o sinal mais forte de "isto é um app, não um site": a navegação
 * principal está no polegar, não escondida num hambúrguer. O "Mais" abre a
 * gaveta de sempre — nada saiu, só mudou de lugar o que se usa toda hora.
 *
 * Comportamento que faz diferença no dedo:
 * - a pílula do item ativo DESLIZA entre os ícones (layoutId), em vez de
 *   piscar de um para o outro;
 * - o ícone tocado afunda (scale) e o aparelho vibra 8 ms, como um botão
 *   físico — só no Android, que é onde `navigator.vibrate` existe;
 * - some ao rolar para baixo e volta ao rolar para cima: lendo, a tela é
 *   toda do conteúdo; procurando, a dock está lá.
 *
 * Só no celular (`lg:hidden`); no desktop a barra lateral continua sendo a
 * navegação.
 */
const ITENS = [
  { path: '/', rotulo: 'Início', Icone: Home },
  { path: '/tasks', rotulo: 'Tarefas', Icone: CheckSquare },
  { path: '/agenda', rotulo: 'Agenda', Icone: CalendarClock, exigeConta: true },
  { path: '/focus', rotulo: 'Foco', Icone: Timer, exigeConta: true },
] as const;

function vibrar(ms: number) {
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
        // Perto do topo, sempre visível; senão, precisa rolar 12px para mudar.
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

export const MobileDock: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { status } = useAuth();
  const escondida = useEscondeAoRolar();

  const ativo = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));
  const nenhumAtivo = !ITENS.some(i => ativo(i.path));

  const ir = (path: string) => {
    vibrar(8);
    setMobileOpen(false);
    if (pathname !== path) navigate(path);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.nav
      aria-label="Navegação principal"
      initial={false}
      animate={{ y: escondida && !mobileOpen ? 96 : 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden px-3"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-border/70 bg-surface/85 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <ul className="flex items-stretch justify-between px-1.5 py-1.5">
          {ITENS.map(({ path, rotulo, Icone, ...resto }) => {
            const on = ativo(path);
            const bloqueado = 'exigeConta' in resto && resto.exigeConta && status !== 'authed';
            return (
              <li key={path} className="flex-1">
                <motion.button
                  type="button"
                  onClick={() => ir(bloqueado ? '/login' : path)}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  aria-current={on ? 'page' : undefined}
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
                    animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`relative z-10 flex h-7 items-center ${on ? 'text-primary-vibrant' : 'text-text-secondary'}`}
                  >
                    <Icone size={22} strokeWidth={on ? 2.4 : 2} />
                  </motion.span>
                  <span className={`relative z-10 ${on ? 'text-primary-vibrant' : 'text-text-soft'}`}>
                    {rotulo}
                  </span>
                </motion.button>
              </li>
            );
          })}
          <li className="flex-1">
            <motion.button
              type="button"
              onClick={() => {
                vibrar(8);
                setMobileOpen(!mobileOpen);
              }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              aria-expanded={mobileOpen}
              aria-label="Mais"
              className="relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10.5px] font-semibold select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-vibrant/60"
            >
              {(mobileOpen || nenhumAtivo) && (
                <motion.span
                  layoutId="dock-pilula"
                  className="absolute inset-x-1 top-0.5 h-8 rounded-full bg-primary-light"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <motion.span
                animate={{ rotate: mobileOpen ? 90 : 0, scale: mobileOpen || nenhumAtivo ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`relative z-10 flex h-7 items-center ${mobileOpen || nenhumAtivo ? 'text-primary-vibrant' : 'text-text-secondary'}`}
              >
                <LayoutGrid size={22} strokeWidth={mobileOpen || nenhumAtivo ? 2.4 : 2} />
              </motion.span>
              <span className={`relative z-10 ${mobileOpen || nenhumAtivo ? 'text-primary-vibrant' : 'text-text-soft'}`}>
                Mais
              </span>
            </motion.button>
          </li>
        </ul>
      </div>
    </motion.nav>
  );
};
