import React, { useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { TaskStatus } from '@/types/task';
import { useTags } from '@/contexts/TagsContext';
import { interpretar } from '@/utils/quickParse';
import { formatDateChip } from '@/utils/date';

interface CriacaoRapidaProps {
  /** Status de quem nasce aqui: o da coluna onde a linha está. */
  status: TaskStatus;
  /** Cria a partir do texto; devolve se criou (para limpar o campo). */
  onCriar: (texto: string, status: TaskStatus) => Promise<boolean>;
  /** Abre o formulário completo com o que já foi escrito. */
  onMaisDetalhes: (texto: string, status: TaskStatus) => void;
}

const PRIORIDADE = { high: 'alta', medium: 'média', low: 'baixa' } as const;

/**
 * "+ Adicionar tarefa" no topo de uma coluna (ou da lista).
 *
 * Digita e Enter: a tarefa nasce ali, já com o status da coluna, entendendo
 * "amanhã", "sexta", "!alta" e "#tag" como o formulário. O campo continua
 * aberto e vazio para a próxima — quem anota três coisas seguidas não precisa
 * clicar três vezes. Esc ou sair do campo vazio recolhe.
 *
 * Não substitui o formulário: "Mais detalhes" abre o completo com o texto já
 * escrito.
 */
export const CriacaoRapida: React.FC<CriacaoRapidaProps> = ({ status, onCriar, onMaisDetalhes }) => {
  const { tags } = useTags();
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);

  const lido = useMemo(
    () => (texto.trim() ? interpretar(texto, new Date(), { tagsConhecidas: tags.map(t => t.name) }) : null),
    [texto, tags],
  );
  const entendido = lido
    ? [
        lido.dueDate && formatDateChip(lido.dueDate),
        lido.priority && PRIORIDADE[lido.priority],
        ...lido.tags.map(t => `#${t}`),
      ].filter(Boolean)
    : [];

  const criar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const ok = await onCriar(texto, status);
    setEnviando(false);
    if (ok) {
      setTexto('');
      campoRef.current?.focus();
    }
  };

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-semibold text-text-soft transition-colors hover:border-primary-vibrant/50 hover:bg-surface hover:text-primary-vibrant"
      >
        <Plus size={16} /> Adicionar tarefa
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-vibrant/40 bg-surface p-2 shadow-sm">
      <div className="flex items-center gap-2 px-1">
        <Plus size={16} className="shrink-0 text-primary-vibrant" aria-hidden="true" />
        <input
          ref={campoRef}
          autoFocus
          value={texto}
          // readOnly, e não disabled: um campo desabilitado perde o foco, e o
          // que a pessoa digitasse logo depois de criar iria para lugar nenhum.
          readOnly={enviando}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void criar();
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              setTexto('');
              setAberta(false);
            }
          }}
          onBlur={() => {
            if (!texto.trim()) setAberta(false);
          }}
          aria-label="Título da nova tarefa"
          placeholder="Ex.: Ligar para o fornecedor amanhã !alta"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-text-primary placeholder-text-soft focus:outline-none"
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 px-1 text-xs">
        <span className="min-w-0 truncate text-text-soft">
          {entendido.length ? `Entendi: ${entendido.join(' · ')}` : 'Enter cria · Esc fecha'}
        </span>
        <button
          type="button"
          // mousedown, não click: o clique tiraria o foco do campo antes, e o
          // onBlur recolheria a linha vazia antes de o botão responder.
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            onMaisDetalhes(texto, status);
            setTexto('');
            setAberta(false);
          }}
          className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-primary-vibrant hover:bg-primary-light"
        >
          Mais detalhes
        </button>
      </div>
    </div>
  );
};
