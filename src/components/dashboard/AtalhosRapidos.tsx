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
 * Na paleta do app (superfície, borda, azul da marca no ícone), do mesmo
 * jeito que os cartões do resto da tela — atalho não é banner. Entram em
 * cascata na abertura e afundam ao tocar.
 *
 * Só no celular (`lg:hidden`): no desktop o topo e a barra lateral já dão
 * tudo isso a um clique, e uma fileira de botões duplicaria.
 */
interface Atalho {
  rotulo: string;
  Icone: LucideIcon;
  path: string;
}

const ATALHOS: Atalho[] = [
  { rotulo: 'Foco', Icone: Timer, path: '/focus' },
  { rotulo: 'Agenda', Icone: CalendarClock, path: '/agenda' },
  { rotulo: 'Calendário', Icone: CalendarDays, path: '/calendar' },
  { rotulo: 'IA', Icone: Sparkles, path: '/ai' },
];

export const AtalhosRapidos: React.FC = () => {
  const navigate = useNavigate();
  const { status } = useAuth();
  const logado = status === 'authed';

  return (
    <motion.ul
      className="lg:hidden mb-4 grid grid-cols-4 gap-2"
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
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            onClick={() => {
              vibrar(8);
              navigate(logado ? a.path : '/login');
            }}
            className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[11px] font-semibold text-text-secondary shadow-sm select-none active:border-primary-vibrant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-vibrant/50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary-vibrant">
              <a.Icone size={18} strokeWidth={2.2} />
            </span>
            {a.rotulo}
          </motion.button>
        </motion.li>
      ))}
    </motion.ul>
  );
};
