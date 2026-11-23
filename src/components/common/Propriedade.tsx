import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { transicao } from '@/components/motion/tokens';

/**
 * Um botão compacto de propriedade ("📅 Sex, 27 nov", "● Alta", "# Tags") que
 * abre um painel pequeno logo abaixo dele.
 *
 * É a peça da linha de propriedades do formulário de tarefa: todas as
 * propriedades numa linha só, cada uma do tamanho do próprio valor, em vez de
 * um campo de formulário por linha.
 *
 * Três estados visuais:
 * - vazio: borda tracejada e texto apagado — "ainda dá para definir";
 * - preenchido: borda normal;
 * - destaque: veio do que foi escrito no título ("sexta", "!alta"), em azul,
 *   para a pessoa ver na hora que o texto foi entendido.
 *
 * O painel vai para um portal com `position: fixed` (o corpo do modal rola e
 * cortaria um painel absoluto), fecha no clique fora e no Esc — e o Esc fecha
 * SÓ o painel, não o modal inteiro.
 */
interface PropriedadeProps {
  icone: React.ReactNode;
  /** O que aparece no botão: o valor, ou o nome da propriedade quando vazia. */
  rotulo: string;
  preenchida: boolean;
  destaque?: boolean;
  /** Nome para o leitor de tela, com o valor: "Prioridade: alta". */
  nomeAcessivel: string;
  disabled?: boolean;
  /** Largura do painel, em px. */
  largura?: number;
  /** Conteúdo do painel; recebe `fechar` para quem escolhe e fecha. */
  children: (fechar: () => void) => React.ReactNode;
}

const GAP = 6;

export const Propriedade: React.FC<PropriedadeProps> = ({
  icone,
  rotulo,
  preenchida,
  destaque = false,
  nomeAcessivel,
  disabled = false,
  largura = 240,
  children,
}) => {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const [estilo, setEstilo] = useState<React.CSSProperties>({});
  const fechar = useCallback(() => setAberto(false), []);

  const posicionar = useCallback(() => {
    const el = botaoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const altura = painelRef.current?.offsetHeight ?? 260;
    const abaixo = window.innerHeight - r.bottom;
    const paraCima = abaixo < altura + GAP && r.top > abaixo;
    const w = Math.min(largura, window.innerWidth - 2 * GAP);
    setEstilo({
      position: 'fixed',
      width: w,
      left: Math.min(Math.max(r.left, GAP), window.innerWidth - GAP - w),
      ...(paraCima ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      maxHeight: Math.max(160, (paraCima ? r.top : abaixo) - 2 * GAP),
      zIndex: 80, // acima do modal (z-70)
    });
  }, [largura]);

  useLayoutEffect(() => {
    if (!aberto) return;
    posicionar();
    // Segunda medição já com a altura real do painel montado.
    const id = requestAnimationFrame(posicionar);
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [aberto, posicionar]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Element;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      // Listas e calendários de seletores DENTRO do painel (as tags, o
      // seletor de equipe) também saem por portal; clicar neles não é
      // "clique fora". Eles se marcam com `data-popup` ou são listbox.
      if (alvo.closest?.('[role="listbox"], [data-popup]')) return;
      setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Captura + stopPropagation: o Esc fecha este painel e não chega ao
      // Modal, que fecharia o formulário inteiro com o que já foi escrito.
      e.stopPropagation();
      setAberto(false);
      botaoRef.current?.focus();
    };
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar, true);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        disabled={disabled}
        onClick={() => setAberto(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={nomeAcessivel}
        className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 ${
          aberto
            ? 'border-primary-vibrant ring-4 ring-primary-light/60'
            : destaque
            ? 'border-primary-vibrant/30 bg-primary-light text-primary-vibrant'
            : preenchida
            ? 'border-border bg-surface text-text-primary hover:border-primary-vibrant/50'
            : 'border-dashed border-border bg-surface text-text-soft hover:border-primary-vibrant/50 hover:text-text-secondary'
        }`}
      >
        <span aria-hidden="true" className="shrink-0">
          {icone}
        </span>
        {rotulo}
      </button>

      {createPortal(
        <AnimatePresence>
          {aberto && (
            <m.div
              ref={painelRef}
              role="dialog"
              aria-label={nomeAcessivel}
              style={estilo}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98, transition: transicao.saida }}
              transition={transicao.rapida}
              className="overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl"
            >
              {children(fechar)}
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export interface OpcaoDaLista {
  valor: string;
  rotulo: string;
  cor?: string;
}

/** Lista de escolha única para dentro de uma Propriedade. */
export const ListaDeOpcoes: React.FC<{
  opcoes: OpcaoDaLista[];
  valor: string;
  onEscolher: (valor: string) => void;
}> = ({ opcoes, valor, onEscolher }) => (
  <ul role="listbox" className="space-y-0.5">
    {opcoes.map(o => {
      const marcada = o.valor === valor;
      return (
        <li key={o.valor} role="option" aria-selected={marcada}>
          <button
            type="button"
            onClick={() => onEscolher(o.valor)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
              marcada ? 'bg-primary-light font-semibold text-primary-vibrant' : 'text-text-primary hover:bg-bg-secondary'
            }`}
          >
            {o.cor && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.cor }} />
            )}
            <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
            {marcada && <Check size={15} className="shrink-0" />}
          </button>
        </li>
      );
    })}
  </ul>
);
