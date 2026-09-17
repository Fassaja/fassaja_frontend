import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Timer, CalendarClock, CalendarDays, Sparkles, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { vibrar } from '@/components/layout/MobileDock';

/**
 * Atalhos do Dashboard no celular: as quatro coisas que alguém abre o app
 * para fazer, a um toque, antes de qualquer número.
 *
 * Cada um é um cartão com gradiente próprio — cor é o que o olho usa para
 * achar um botão sem ler. Entram em cascata na abertura e afundam ao tocar.
 *
 * Só no celular (`lg:hidden`): no desktop o topo e a barra lateral já dão
 * tudo isso a um clique, e uma fileira de botões duplicaria.
 */
interface Atalho {
  rotulo: string;
  Icone: LucideIcon;
  /** Gradiente e sombra na mesma família de cor. */
  cor: string;
  path: string;
}

const ATALHOS: Atalho[] = [
  { rotulo: 'Foco', Icone: Timer, cor: 'from-emerald-400 to-teal-600 shadow-emerald-500/30', path: '/focus' },
  { rotulo: 'Agenda', Icone: CalendarClock, cor: 'from-sky-400 to-indigo-600 shadow-indigo-500/30', path: '/agenda' },
  { rotulo: 'Calendário', Icone: CalendarDays, cor: 'from-orange-400 to-rose-500 shadow-rose-500/30', path: '/calendar' },
  { rotulo: 'IA', Icone: Sparkles, cor: 'from-violet-500 to-fuchsia-600 shadow-fuchsia-500/30', path: '/ai' },
];

export const AtalhosRapidos: React.FC = () => {
  const navigate = useNavigate();
  const { status } = useAuth();
  const logado = status === 'authed';

  return (
    <motion.ul
      className="lg:hidden mb-5 grid grid-cols-4 gap-2.5"
      initial="fora"
      animate="dentro"
      variants={{ dentro: { transition: { staggerChildren: 0.05 } } }}
    >
      {ATALHOS.map(a => (
        <motion.li
          key={a.rotulo}
          variants={{
            fora: { opacity: 0, y: 14, scale: 0.94 },
            dentro: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 30 } },
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.93, y: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            onClick={() => {
              vibrar(8);
              navigate(logado ? a.path : '/login');
            }}
            className={`relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br ${a.cor} text-white shadow-lg select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50`}
          >
            {/* Brilho no canto superior: dá volume ao cartão sem imagem. */}
            <span className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-white/25 blur-xl" />
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <a.Icone size={22} strokeWidth={2.4} />
            </span>
            <span className="text-[11px] font-bold tracking-wide drop-shadow-sm">{a.rotulo}</span>
          </motion.button>
        </motion.li>
      ))}
    </motion.ul>
  );
};
