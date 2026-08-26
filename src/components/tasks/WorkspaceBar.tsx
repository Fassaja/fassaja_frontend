import React, { useEffect, useRef, useState } from 'react';
import { Plus, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Workspace } from '@/services/workspacesService';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Props {
  areas: Workspace[];
  ativaId: string | null;
  alterada: boolean;
  onSelecionar: (id: string | null) => void;
  onCriar: (nome: string) => void;
  onRenomear: (id: string, nome: string) => void;
  onSalvarFiltros: (id: string) => void;
  onDescartar: () => void;
  onExcluir: (id: string) => void;
  limite: number;
}

/**
 * Barra de áreas de trabalho.
 *
 * Abas, porque a ação principal é TROCAR de recorte — o mesmo gesto de trocar
 * de aba no navegador, e o mesmo aprendizado.
 *
 * Duas decisões mantêm a barra quieta:
 *
 * 1. Nomear acontece DENTRO da aba. A versão anterior trocava a barra inteira
 *    por um formulário: as abas sumiam, e quem estava só renomeando perdia de
 *    vista onde estava. Aqui a aba vira um campo do próprio tamanho dela.
 *
 * 2. Renomear e excluir moram num menu na aba ativa. Eram dois botões fixos ao
 *    lado de outros dois — quatro controles permanentes para ações que se usa
 *    uma vez por mês.
 */
export const WorkspaceBar: React.FC<Props> = ({
  areas,
  ativaId,
  alterada,
  onSelecionar,
  onCriar,
  onRenomear,
  onSalvarFiltros,
  onDescartar,
  onExcluir,
  limite,
}) => {
  // `null` = ninguém em edição; 'nova' = criando; um id = renomeando aquela.
  const [editando, setEditando] = useState<string | 'nova' | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<Workspace | null>(null);

  const confirmar = (nome: string) => {
    const limpo = nome.trim();
    if (limpo) {
      if (editando === 'nova') onCriar(limpo);
      else if (editando) onRenomear(editando, limpo);
    }
    setEditando(null);
  };

  const ativa = areas.find(a => a.id === ativaId) ?? null;
  const cheio = areas.length >= limite;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {areas.length > 0 && (
          <Aba ativa={ativaId === null} onClick={() => onSelecionar(null)}>
            Início
          </Aba>
        )}

        {areas.map(a =>
          editando === a.id ? (
            <CampoDeNome key={a.id} inicial={a.name} onConfirmar={confirmar} onCancelar={() => setEditando(null)} />
          ) : (
            <Aba
              key={a.id}
              ativa={ativaId === a.id}
              onClick={() => onSelecionar(a.id)}
              pendente={ativaId === a.id && alterada}
              // A seta só existe na aba ativa: é dela que as ações tratam.
              menu={
                ativaId === a.id ? (
                  <MenuDaAba
                    aberto={menuAberto}
                    onAbrir={() => setMenuAberto(v => !v)}
                    onFechar={() => setMenuAberto(false)}
                    onRenomear={() => {
                      setMenuAberto(false);
                      setEditando(a.id);
                    }}
                    onExcluir={() => {
                      setMenuAberto(false);
                      setExcluindo(a);
                    }}
                  />
                ) : undefined
              }
            >
              {a.name}
            </Aba>
          ),
        )}

        {editando === 'nova' && (
          <CampoDeNome inicial="" onConfirmar={confirmar} onCancelar={() => setEditando(null)} />
        )}

        {!cheio && editando !== 'nova' && (
          <button
            type="button"
            onClick={() => setEditando('nova')}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-text-secondary transition-colors hover:text-primary-vibrant sm:h-8"
          >
            <Plus size={15} />
            {areas.length === 0 ? 'Salvar filtros como área' : 'Nova área'}
          </button>
        )}

        {/* Aparecem só quando há o que salvar. Texto simples, e não botões
            preenchidos: são ações passageiras ao lado de uma barra que a pessoa
            usa o tempo todo, e dois botões sólidos ali roubariam a atenção das
            próprias abas. */}
        {ativa && alterada && (
          <span className="flex items-center gap-3 pl-2 text-sm sm:ml-auto">
            <button
              type="button"
              onClick={() => onSalvarFiltros(ativa.id)}
              className="font-semibold text-primary-vibrant underline-offset-4 hover:underline"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onDescartar}
              className="text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            >
              Desfazer
            </button>
          </span>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!excluindo}
        tone="danger"
        title={`Excluir a área "${excluindo?.name}"?`}
        message="Só o atalho é removido."
        hint={
          <>
            <strong className="text-text-primary">Suas tarefas continuam onde estão.</strong> Uma
            área de trabalho guarda apenas um conjunto de filtros.
          </>
        }
        confirmLabel="Excluir área"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (excluindo) onExcluir(excluindo.id);
          setExcluindo(null);
        }}
        onClose={() => setExcluindo(null)}
      />
    </>
  );
};

const Aba: React.FC<{
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Ponto de "há filtros alterados que esta área ainda não guarda". */
  pendente?: boolean;
  menu?: React.ReactNode;
}> = ({ ativa, onClick, children, pendente, menu }) => (
  <span
    className={`relative inline-flex h-10 items-center rounded-lg transition-colors sm:h-8 ${
      ativa ? 'bg-primary-light' : 'hover:bg-bg-secondary'
    }`}
  >
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? 'true' : undefined}
      className={`inline-flex h-full max-w-[11rem] items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold ${
        ativa ? 'text-primary-vibrant' : 'text-text-secondary'
      } ${menu ? 'pr-1' : ''}`}
    >
      <span className="truncate">{children}</span>
      {pendente && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-vibrant"
          title="Filtros alterados que esta área ainda não guarda"
        />
      )}
    </button>
    {menu}
  </span>
);

/** Campo que ocupa o lugar da aba enquanto se dá nome a ela. */
const CampoDeNome: React.FC<{
  inicial: string;
  onConfirmar: (nome: string) => void;
  onCancelar: () => void;
}> = ({ inicial, onConfirmar, onCancelar }) => {
  const [valor, setValor] = useState(inicial);
  /* Esc desfoca o campo, e o `onBlur` salvaria logo depois — desfazendo o
     cancelamento que a pessoa acabou de pedir. Esta trava marca a saída como
     intencional para o blur ignorá-la. */
  const cancelado = useRef(false);

  return (
    <input
      autoFocus
      value={valor}
      onChange={e => setValor(e.target.value)}
      onBlur={() => {
        if (cancelado.current) return;
        onConfirmar(valor);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') onConfirmar(valor);
        if (e.key === 'Escape') {
          cancelado.current = true;
          onCancelar();
        }
      }}
      maxLength={32}
      placeholder="Nome da área"
      aria-label="Nome da área"
      // `w-36` e não `flex-1`: um campo que se estica empurraria as abas
      // vizinhas para outra linha só por entrar em modo de edição.
      className="h-10 w-36 rounded-lg border border-primary-vibrant bg-surface px-2.5 text-sm font-semibold text-text-primary outline-none ring-4 ring-primary-light/60 placeholder:font-normal placeholder:text-text-soft sm:h-8"
    />
  );
};

const MenuDaAba: React.FC<{
  aberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  onRenomear: () => void;
  onExcluir: () => void;
}> = ({ aberto, onAbrir, onFechar, onRenomear, onExcluir }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onFechar();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto, onFechar]);

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={onAbrir}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Ações da área"
        className="inline-flex h-10 w-7 items-center justify-center rounded-r-lg text-primary-vibrant/70 hover:text-primary-vibrant sm:h-8"
      >
        <ChevronDown size={14} className={aberto ? 'rotate-180' : ''} />
      </button>
      {aberto && (
        <span
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={onRenomear}
            className="flex items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-secondary"
          >
            <Pencil size={15} className="text-text-secondary" /> Renomear
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onExcluir}
            className="flex items-center gap-2.5 px-3 py-2 text-left text-sm text-danger hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 size={15} /> Excluir área
          </button>
        </span>
      )}
    </span>
  );
};
