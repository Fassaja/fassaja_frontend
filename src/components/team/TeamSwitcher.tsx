import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { TeamSummary } from '@/types/team';

interface Props {
  teams: TeamSummary[];
  atual: TeamSummary;
  onSelecionar: (teamId: string) => void;
  onCriar: () => void;
}

/**
 * A troca de equipe, no próprio título da página.
 *
 * Antes eram abas coloridas empilhadas acima do conteúdo: ocupavam uma faixa
 * inteira para uma escolha que se faz uma vez por sessão, e com cinco equipes
 * viravam uma barra de rolagem horizontal. No título, a mesma escolha custa um
 * chevron — e o nome da equipe deixa de aparecer duas vezes na tela.
 */
export const TeamSwitcher: React.FC<Props> = ({ teams, atual, onSelecionar, onCriar }) => {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora e no Esc. Sem as duas, o menu fica preso na tela
  // depois de a pessoa desistir dele — e cobre o conteúdo que ela quer ver.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="group flex min-w-0 items-center gap-2 rounded-lg text-left transition-colors hover:text-primary-vibrant"
      >
        <span className="min-w-0 truncate">{atual.name}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-soft transition-transform group-hover:text-primary-vibrant ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {teams.map(t => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                onSelecionar(t.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-text-soft">{t.memberCount}</span>
              {t.id === atual.id && <Check size={14} className="shrink-0 text-primary-vibrant" />}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              onCriar();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-primary-vibrant transition-colors hover:bg-primary-light"
          >
            <Plus size={15} className="shrink-0" /> Nova equipe
          </button>
        </div>
      )}
    </div>
  );
};
