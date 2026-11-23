import React from 'react';
import { CircleDashed, Flag, FolderOpen, GitBranch, Hash, UserRound } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '@/types/task';
import { DatePicker } from '@/components/common/DatePicker';
import { ListaDeOpcoes, Propriedade, type OpcaoDaLista } from '@/components/common/Propriedade';
import { TagSelector } from './TagSelector';
import { useProjects } from '@/hooks/useProjects';
import { useTags } from '@/contexts/TagsContext';

export const OPCOES_DE_PRIORIDADE: OpcaoDaLista[] = [
  { valor: 'low', rotulo: 'Baixa', cor: '#22C55E' },
  { valor: 'medium', rotulo: 'Média', cor: '#FBBF24' },
  { valor: 'high', rotulo: 'Alta', cor: '#8B5CF6' },
];

export const OPCOES_DE_STATUS: OpcaoDaLista[] = [
  { valor: 'pending', rotulo: 'Pendente', cor: '#64748B' },
  { valor: 'in_progress', rotulo: 'Em progresso', cor: '#2477FF' },
  { valor: 'completed', rotulo: 'Concluída', cor: '#22C55E' },
];

interface LinhaDePropriedadesProps {
  disabled?: boolean;

  prazo: string;
  onPrazo: (v: string) => void;
  /** O prazo veio do título ("sexta"): botão em azul. */
  prazoDestaque?: boolean;

  /** Início: só em tarefa de equipe (é o cronograma que o lê). */
  inicio?: { valor: string; onMudar: (v: string) => void };

  prioridade: TaskPriority;
  onPrioridade: (v: TaskPriority) => void;
  prioridadeDestaque?: boolean;

  projetoId: string;
  onProjeto: (v: string) => void;

  status: TaskStatus;
  onStatus: (v: TaskStatus) => void;
  /** Rótulo do status: "Começar como" na criação, "Status" na edição. */
  rotuloDoStatus?: string;

  /** Tags; ausente para visitante (não há tags sem conta). */
  tags?: { ids: string[]; onMudar: (ids: string[]) => void };

  /** Responsáveis: o painel (seletor de equipe/membros) vem de quem usa. */
  responsaveis?: { quantidade: number; painel: React.ReactNode };

  /** "Depois de": só na edição de tarefa de equipe, por quem pode encadear. */
  depoisDe?: { opcoes: OpcaoDaLista[]; valor: string; onMudar: (v: string) => void };
}

/**
 * A linha de propriedades da tarefa — a MESMA no criar e no editar.
 *
 * Criar e editar são a mesma tarefa vista duas vezes; quando cada formulário
 * tinha os próprios controles, os dois divergiam e a edição parecia outro
 * produto. Agora as duas telas montam esta linha, e uma mudança aqui vale
 * para as duas.
 *
 * No celular a linha rola de lado em vez de quebrar (a folha fica baixa e o
 * título continua à vista); do `sm` para cima ela quebra normalmente.
 */
export const LinhaDePropriedades: React.FC<LinhaDePropriedadesProps> = ({
  disabled = false,
  prazo,
  onPrazo,
  prazoDestaque = false,
  inicio,
  prioridade,
  onPrioridade,
  prioridadeDestaque = false,
  projetoId,
  onProjeto,
  status,
  onStatus,
  rotuloDoStatus = 'Status',
  tags,
  responsaveis,
  depoisDe,
}) => {
  const { projects } = useProjects();
  const { tags: todasAsTags } = useTags();

  const opcoesDeProjeto: OpcaoDaLista[] = [
    { valor: '', rotulo: 'Sem projeto' },
    ...projects.map(p => ({ valor: p.id, rotulo: p.name, cor: p.color })),
  ];
  const prio = OPCOES_DE_PRIORIDADE.find(o => o.valor === prioridade);
  const stat = OPCOES_DE_STATUS.find(o => o.valor === status);
  const projeto = opcoesDeProjeto.find(o => o.valor === projetoId);
  const nomesDasTags = (tags?.ids ?? [])
    .map(id => todasAsTags.find(t => t.id === id)?.name)
    .filter((n): n is string => !!n);
  const mae = depoisDe?.opcoes.find(o => o.valor === depoisDe.valor && o.valor !== '');

  return (
    <div
      role="group"
      aria-label="Propriedades da tarefa"
      className="-mx-5 flex gap-1.5 overflow-x-auto border-t border-border px-5 pb-1 pt-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {inicio && (
        <DatePicker
          value={inicio.valor}
          onChange={inicio.onMudar}
          placeholder="Início"
          disabled={disabled}
          size="sm"
        />
      )}
      <DatePicker
        value={prazo}
        onChange={onPrazo}
        placeholder="Prazo"
        disabled={disabled}
        size="sm"
        destaque={prazoDestaque}
      />

      <Propriedade
        icone={<Flag size={14} style={{ color: prio?.cor }} />}
        rotulo={prio?.rotulo ?? 'Prioridade'}
        preenchida
        destaque={prioridadeDestaque}
        nomeAcessivel={`Prioridade: ${prio?.rotulo ?? 'média'}`}
        disabled={disabled}
        largura={180}
      >
        {fechar => (
          <ListaDeOpcoes
            opcoes={OPCOES_DE_PRIORIDADE}
            valor={prioridade}
            onEscolher={v => {
              onPrioridade(v as TaskPriority);
              fechar();
            }}
          />
        )}
      </Propriedade>

      <Propriedade
        icone={<FolderOpen size={14} style={projeto?.cor ? { color: projeto.cor } : undefined} />}
        rotulo={projetoId ? projeto?.rotulo ?? 'Projeto' : 'Projeto'}
        preenchida={!!projetoId}
        nomeAcessivel={`Projeto: ${projetoId ? projeto?.rotulo : 'nenhum'}`}
        disabled={disabled}
        largura={240}
      >
        {fechar => (
          <ListaDeOpcoes
            opcoes={opcoesDeProjeto}
            valor={projetoId}
            onEscolher={v => {
              onProjeto(v);
              fechar();
            }}
          />
        )}
      </Propriedade>

      <Propriedade
        icone={<CircleDashed size={14} style={{ color: stat?.cor }} />}
        rotulo={stat?.rotulo ?? 'Pendente'}
        preenchida={status !== 'pending'}
        nomeAcessivel={`${rotuloDoStatus}: ${stat?.rotulo ?? 'pendente'}`}
        disabled={disabled}
        largura={190}
      >
        {fechar => (
          <ListaDeOpcoes
            opcoes={OPCOES_DE_STATUS}
            valor={status}
            onEscolher={v => {
              onStatus(v as TaskStatus);
              fechar();
            }}
          />
        )}
      </Propriedade>

      {tags && (
        <Propriedade
          icone={<Hash size={14} />}
          rotulo={
            nomesDasTags.length
              ? nomesDasTags.slice(0, 2).join(', ') + (nomesDasTags.length > 2 ? ` +${nomesDasTags.length - 2}` : '')
              : 'Tags'
          }
          preenchida={nomesDasTags.length > 0}
          nomeAcessivel={`Tags: ${nomesDasTags.length ? nomesDasTags.join(', ') : 'nenhuma'}`}
          disabled={disabled}
          largura={300}
        >
          {() => (
            <div className="p-1.5">
              <TagSelector value={tags.ids} onChange={tags.onMudar} disabled={disabled} />
            </div>
          )}
        </Propriedade>
      )}

      {responsaveis && (
        <Propriedade
          icone={<UserRound size={14} />}
          rotulo={
            responsaveis.quantidade
              ? `${responsaveis.quantidade} ${responsaveis.quantidade === 1 ? 'responsável' : 'responsáveis'}`
              : 'Responsável'
          }
          preenchida={responsaveis.quantidade > 0}
          nomeAcessivel={`Responsáveis: ${responsaveis.quantidade || 'nenhum'}`}
          disabled={disabled}
          largura={300}
        >
          {() => <div className="p-2">{responsaveis.painel}</div>}
        </Propriedade>
      )}

      {depoisDe && (
        <Propriedade
          icone={<GitBranch size={14} />}
          rotulo={mae ? `Depois de: ${mae.rotulo}` : 'Depois de'}
          preenchida={!!mae}
          nomeAcessivel={`Depois de: ${mae?.rotulo ?? 'nenhuma'}`}
          disabled={disabled}
          largura={300}
        >
          {fechar => (
            <ListaDeOpcoes
              opcoes={depoisDe.opcoes}
              valor={depoisDe.valor}
              onEscolher={v => {
                depoisDe.onMudar(v);
                fechar();
              }}
            />
          )}
        </Propriedade>
      )}
    </div>
  );
};
