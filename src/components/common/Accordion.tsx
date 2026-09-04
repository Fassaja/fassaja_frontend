import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  /** Chave estável — decide qual item abre por padrão. */
  id: string;
  title: React.ReactNode;
  /** Ícone opcional à esquerda do título. */
  icon?: React.ReactNode;
  /**
   * Valor atual, mostrado na linha FECHADA.
   *
   * É o que evita transformar a tela num jogo de abrir gavetas para descobrir
   * como as coisas estão: "Metas" não diz nada, "5/dia · 25/semana" diz. Some
   * quando o item abre, porque aí o próprio conteúdo mostra o valor.
   */
  summary?: React.ReactNode;
  /**
   * Grupo a que o item pertence. Quando muda de um item para o próximo, um
   * rótulo é desenhado antes dele.
   *
   * É campo do ITEM, e não vários acordeões lado a lado, para preservar o "só
   * um aberto por vez": acordeões separados teriam cada um o seu estado, e a
   * tela poderia ficar com três painéis abertos ao mesmo tempo.
   */
  group?: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Item aberto ao montar. Sem isso, todos começam fechados. */
  defaultOpenId?: string;
  className?: string;
}

/**
 * Acordeão de conteúdo.
 *
 * A correção mais importante em relação ao componente de referência é de
 * ACESSIBILIDADE: lá o painel fechado vira `height: 0` com `overflow: hidden`,
 * mas o conteúdo continua no DOM e na ordem de tabulação. Quem navega por
 * teclado entra em texto invisível, e o leitor de tela lê tudo, aberto ou não.
 * Aqui o painel fechado recebe `inert`, que o tira das duas coisas.
 *
 * A altura é medida com ResizeObserver em vez de fixada: o conteúdo muda de
 * tamanho (texto que quebra em outra largura, bloco condicional), e um valor
 * fixo cortaria o final.
 */
const AccordionPanel: React.FC<{
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  baseId: string;
}> = ({ item, isOpen, onToggle, baseId }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const medir = () => setHeight(el.scrollHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // `inert` ainda não está no tipo de HTMLDivElement em toda versão do TS, e
  // como atributo do JSX o React só o repassa em versões recentes — por isso
  // vai pelo DOM, que funciona em qualquer uma.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (isOpen) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [isOpen]);

  const triggerId = `${baseId}-trigger-${item.id}`;
  const panelId = `${baseId}-panel-${item.id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <h3>
        <button
          id={triggerId}
          type="button"
          aria-controls={panelId}
          aria-expanded={isOpen}
          onClick={onToggle}
          className="flex w-full items-center gap-3 px-1 py-4 text-left transition-colors hover:text-primary-vibrant"
        >
          {item.icon}
          <span className="flex-1 text-sm font-bold text-text-primary">{item.title}</span>
          {item.summary && !isOpen && (
            <span className="hidden truncate text-xs text-text-secondary sm:block sm:max-w-[45%]">
              {item.summary}
            </span>
          )}
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="shrink-0 text-text-secondary"
          >
            <ChevronDown size={18} />
          </motion.span>
        </button>
      </h3>

      <motion.div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        initial={false}
        animate={{ height: isOpen ? height : 0, opacity: isOpen ? 1 : 0 }}
        transition={{
          height: { type: 'spring', stiffness: 340, damping: 34 },
          opacity: { duration: 0.18 },
        }}
        style={{ overflow: 'hidden' }}
      >
        <div ref={contentRef} className="px-1 pb-5">
          {item.content}
        </div>
      </motion.div>
    </div>
  );
};

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenId,
  className = '',
}) => {
  const rawId = useId();
  const baseId = `acc-${rawId.replace(/:/g, '')}`;
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);

  return (
    <div className={className}>
      {items.map((item, i) => {
        const abreGrupo = !!item.group && item.group !== items[i - 1]?.group;
        return (
          <React.Fragment key={item.id}>
            {abreGrupo && (
              <p className="px-1 pb-1 pt-6 text-xs font-bold uppercase tracking-wide text-text-soft first:pt-0">
                {item.group}
              </p>
            )}
            <AccordionPanel
              item={item}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(prev => (prev === item.id ? null : item.id))}
              baseId={baseId}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
