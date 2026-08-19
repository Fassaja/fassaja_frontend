import React, { useState } from 'react';
import { Plus, Check, Pencil, Trash2, X, LayoutPanelLeft } from 'lucide-react';
import { Workspace, FiltrosDaArea } from '@/services/workspacesService';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Props {
  areas: Workspace[];
  ativaId: string | null;
  /** Os filtros da tela AGORA — para saber se a área ativa foi alterada. */
  alterada: boolean;
  onSelecionar: (id: string | null) => void;
  onCriar: (nome: string) => void;
  onRenomear: (id: string, nome: string) => void;
  onSalvarFiltros: (id: string) => void;
  onDescartar: () => void;
  onExcluir: (id: string) => void;
  filtrosAtuais: FiltrosDaArea;
  limite: number;
}

/**
 * Barra de áreas de trabalho.
 *
 * Aparece como abas porque a ação é TROCAR entre recortes — o mesmo gesto de
 * trocar de aba no navegador. Um seletor suspenso esconderia quantas existem e
 * qual está ativa, que é a informação principal.
 *
 * Quem nunca criou uma área vê só o botão de criar, discreto. Cromo permanente
 * para um recurso opcional é peso para todo mundo pagar pelo uso de alguns.
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
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Workspace | null>(null);

  const cheio = areas.length >= limite;

  const confirmarNome = (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo) return;
    if (renomeando) onRenomear(renomeando, limpo);
    else onCriar(limpo);
    setNome('');
    setCriando(false);
    setRenomeando(null);
  };

  const cancelar = () => {
    setNome('');
    setCriando(false);
    setRenomeando(null);
  };

  if (criando || renomeando) {
    return (
      <form onSubmit={confirmarNome} className="mb-3 flex items-center gap-2">
        <input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && cancelar()}
          maxLength={32}
          placeholder={renomeando ? 'Novo nome da área' : 'Nome da área (ex.: Trabalho)'}
          aria-label={renomeando ? 'Novo nome da área' : 'Nome da nova área'}
          className="h-10 sm:h-9 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary placeholder-text-soft focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={!nome.trim()}
          className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl bg-primary-vibrant px-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Check size={15} /> {renomeando ? 'Renomear' : 'Criar'}
        </button>
        <button
          type="button"
          onClick={cancelar}
          aria-label="Cancelar"
          className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border text-text-secondary"
        >
          <X size={15} />
        </button>
      </form>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {areas.length > 0 && (
          <>
            {/* "Padrão" é o estado sem área: sempre existe e não se apaga.
                Sem ele não haveria caminho de volta depois de entrar numa. */}
            <Aba
              ativa={ativaId === null}
              onClick={() => onSelecionar(null)}
              icone={<LayoutPanelLeft size={14} />}
            >
              Padrão
            </Aba>
            {areas.map(a => (
              <Aba
                key={a.id}
                ativa={ativaId === a.id}
                onClick={() => onSelecionar(a.id)}
                marcador={ativaId === a.id && alterada}
              >
                {a.name}
              </Aba>
            ))}
          </>
        )}

        {!cheio && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex h-10 sm:h-8 items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
          >
            <Plus size={14} />
            {areas.length === 0 ? 'Salvar estes filtros como área' : 'Nova área'}
          </button>
        )}

        {/* Ações da área ativa. Só aparecem quando há uma — e a de salvar, só
            quando há de fato o que salvar.

            `w-full` no celular: com as abas quebrando em várias linhas, o
            `ml-auto` sozinho jogava as ações para o fim de qualquer linha em que
            sobrassem — às vezes espremidas ao lado de uma aba. */}
        {ativaId && (
          <span className="flex w-full items-center justify-end gap-1.5 sm:ml-auto sm:w-auto">
            {alterada && (
              <>
                <button
                  type="button"
                  onClick={() => onSalvarFiltros(ativaId)}
                  className="inline-flex h-10 sm:h-8 items-center gap-1.5 rounded-lg bg-primary-vibrant px-2.5 text-sm font-semibold text-white"
                >
                  <Check size={14} /> Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={onDescartar}
                  className="inline-flex h-10 sm:h-8 items-center rounded-lg border border-border px-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
                >
                  Descartar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                const a = areas.find(x => x.id === ativaId);
                setNome(a?.name ?? '');
                setRenomeando(ativaId);
              }}
              aria-label="Renomear área"
              className="inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-text-soft transition-colors hover:text-text-primary"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => setExcluindo(areas.find(x => x.id === ativaId) ?? null)}
              aria-label="Excluir área"
              className="inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-text-soft transition-colors hover:text-danger"
            >
              <Trash2 size={14} />
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
  icone?: React.ReactNode;
  /** Ponto de "tem alteração não salva". */
  marcador?: boolean;
}> = ({ ativa, onClick, children, icone, marcador }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={ativa ? 'true' : undefined}
    className={`inline-flex h-10 sm:h-8 max-w-[12rem] items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors ${
      ativa
        ? 'bg-primary-light text-primary-vibrant'
        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
    }`}
  >
    {icone}
    <span className="truncate">{children}</span>
    {marcador && (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-vibrant"
        title="Filtros alterados — não salvos nesta área"
      />
    )}
  </button>
);
