import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { TeamSummary } from '@/types/team';

interface Props {
  teams: TeamSummary[];
  atual: TeamSummary;
  onSelecionar: (teamId: string) => void;
  onCriar: () => void;
}

const MENU_MAX_H = 288; // max-h-72
const GAP = 8;

/**
 * A troca de equipe, no próprio título da página.
 *
 * Antes eram abas coloridas empilhadas acima do conteúdo: ocupavam uma faixa
 * inteira para uma escolha que se faz uma vez por sessão, e com cinco equipes
 * viravam uma barra de rolagem horizontal. No título, a mesma escolha custa um
 * chevron — e o nome da equipe deixa de aparecer duas vezes na tela.
 *
 * O menu vive num PORTAL com `position: fixed`, e isso não é preciosismo: o
 * título mora dentro de um contêiner com `truncate` no Topbar, e `truncate` é
 * `overflow: hidden`. Um menu posicionado em relação ao gatilho era recortado
 * por esse ancestral e simplesmente não aparecia — o chevron abria o nada.
 * Mesma solução do componente Dropdown, pelo mesmo motivo.
 */
export const TeamSwitcher: React.FC<Props> = ({ teams, atual, onSelecionar, onCriar }) => {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [estilo, setEstilo] = useState<React.CSSProperties>({});

  const posicionar = useCallback(() => {
    const el = gatilho.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const abaixo = window.innerHeight - r.bottom;
    const acima = r.top;
    // Abre para cima quando não cabe embaixo — em janela baixa, o menu ficava
    // com dois itens visíveis e o resto fora da tela.
    const paraCima = abaixo < Math.min(MENU_MAX_H + GAP, 240) && acima > abaixo;

    const s: React.CSSProperties = {
      position: 'fixed',
      zIndex: 80, // acima de modais (z-70)
      maxHeight: Math.max(160, Math.min(MENU_MAX_H, (paraCima ? acima : abaixo) - GAP)),
      // Sem passar da borda em telas estreitas.
      left: Math.min(Math.max(r.left, GAP), Math.max(GAP, window.innerWidth - GAP - 256)),
    };
    if (paraCima) s.bottom = window.innerHeight - r.top + GAP;
    else s.top = r.bottom + GAP;
    setEstilo(s);
  }, []);

  useLayoutEffect(() => {
    if (!aberto) return;
    posicionar();
    const mover = () => posicionar();
    window.addEventListener('scroll', mover, true); // capture: pega scroll interno
    window.addEventListener('resize', mover);
    return () => {
      window.removeEventListener('scroll', mover, true);
      window.removeEventListener('resize', mover);
    };
  }, [aberto, posicionar]);

  // Fecha ao clicar fora (gatilho E menu, que agora vivem em nós diferentes)
  // e no Esc. Sem as duas, o menu fica preso na tela depois de a pessoa
  // desistir dele — e cobre o conteúdo que ela quer ver.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (gatilho.current?.contains(alvo)) return;
      if (menu.current?.contains(alvo)) return;
      setAberto(false);
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
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Equipe ${atual.name}. Trocar de equipe`}
        className="group flex min-w-0 max-w-full items-center gap-2 rounded-lg text-left transition-colors hover:text-primary-vibrant"
      >
        <span className="min-w-0 truncate">{atual.name}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-soft transition-transform group-hover:text-primary-vibrant ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={estilo}
            className="w-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-base font-normal shadow-lg"
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
                <span className="shrink-0 text-xs tabular-nums text-text-soft">
                  {t.memberCount}
                </span>
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
          </div>,
          document.body,
        )}
    </>
  );
};
