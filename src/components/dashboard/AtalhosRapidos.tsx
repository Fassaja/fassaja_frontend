import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, CalendarDays, Sparkles, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { vibrar } from '@/components/layout/MobileDock';

/**
 * Atalhos do Dashboard no celular: as quatro coisas que alguém abre o app
 * para fazer, a um toque, antes de qualquer número.
 *
 * Só no celular (`lg:hidden`): no desktop o topo e a barra lateral já dão
 * tudo isso a um clique, e uma fileira de botões duplicaria.
 */
interface Atalho {
  rotulo: string;
  Icone: LucideIcon;
  cor: string;
  acao: () => void;
}

export const AtalhosRapidos: React.FC<{ onNovaTarefa: () => void }> = ({ onNovaTarefa }) => {
  const navigate = useNavigate();
  const { status } = useAuth();
  const logado = status === 'authed';
  const irLogado = (path: string) => navigate(logado ? path : '/login');

  const atalhos: Atalho[] = [
    { rotulo: 'Nova tarefa', Icone: Plus, cor: 'bg-primary-vibrant text-white', acao: onNovaTarefa },
    { rotulo: 'Projetos', Icone: FolderKanban, cor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', acao: () => irLogado('/projects') },
    { rotulo: 'Calendário', Icone: CalendarDays, cor: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', acao: () => irLogado('/calendar') },
    { rotulo: 'IA', Icone: Sparkles, cor: 'bg-violet-500/15 text-violet-600 dark:text-violet-300', acao: () => irLogado('/ai') },
  ];

  return (
    <ul className="lg:hidden mb-4 grid grid-cols-4 gap-2">
      {atalhos.map(a => (
        <li key={a.rotulo}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            onClick={() => {
              vibrar(8);
              a.acao();
            }}
            className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-1 py-3 text-[11px] font-semibold text-text-primary shadow-sm select-none"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.cor}`}>
              <a.Icone size={20} strokeWidth={2.4} />
            </span>
            {a.rotulo}
          </motion.button>
        </li>
      ))}
    </ul>
  );
};
