import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { Button } from '@/components/common/Button';
import { Kbd } from '@/components/common/Kbd';
import { Toggle } from '@/components/common/Toggle';
import { ListaDeOpcoes, Propriedade, type OpcaoDaLista } from '@/components/common/Propriedade';
import { CircleDashed, Flag, FolderOpen, Hash, UserRound } from 'lucide-react';
import { ehMac, plataformaAtual } from '@/utils/atalhos';
import { AssigneeSelector } from './AssigneeSelector';
import { DelegarSemProjeto } from './DelegarSemProjeto';
import { DatePicker } from '@/components/common/DatePicker';
import { TagSelector } from './TagSelector';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TeamMember } from '@/types/team';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';
import { useTags } from '@/contexts/TagsContext';
import { interpretar } from '@/utils/quickParse';
import { AjudaDoTitulo } from './AjudaDoTitulo';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  /**
   * Status inicial do formulário. Usado por quem abre o modal a partir de uma
   * COLUNA do quadro: clicar em "Adicionar tarefa" dentro de "Em andamento" e
   * receber uma tarefa pendente seria ignorar o que a pessoa acabou de apontar.
   */
  initialStatus?: TaskStatus;
  /** Projeto pré-selecionado (ex.: criar direto no painel de uma equipe). */
  initialProjectId?: string;
  /**
   * Título já escrito. Vem do "Mais detalhes" da linha de criação rápida da
   * coluna: o que a pessoa digitou ali continua aqui, sem precisar redigitar.
   */
  initialTitle?: string;
}

const priorityOptions: OpcaoDaLista[] = [
  { valor: 'low', rotulo: 'Baixa', cor: '#22C55E' },
  { valor: 'medium', rotulo: 'Média', cor: '#FBBF24' },
  { valor: 'high', rotulo: 'Alta', cor: '#8B5CF6' },
];

const statusOptions: OpcaoDaLista[] = [
  { valor: 'pending', rotulo: 'Pendente', cor: '#64748B' },
  { valor: 'in_progress', rotulo: 'Em progresso', cor: '#2477FF' },
  { valor: 'completed', rotulo: 'Concluída', cor: '#22C55E' },
];

const CHAVE_CRIAR_OUTRA = 'fassaja_criar_outra';
function lerCriarOutra(): boolean {
  try {
    return localStorage.getItem(CHAVE_CRIAR_OUTRA) === '1';
  } catch {
    return false;
  }
}

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium' as TaskPriority,
  status: 'pending' as TaskStatus,
  projectId: '',
  dueDate: '',
  startDate: '',
};

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
  initialStatus,
  initialProjectId,
  initialTitle,
}) => {
  const { projects } = useProjects();
  const { assignTask } = useTasks();
  const { account, isGuest } = useAuth();
  const { tags } = useTags();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  // Reaplica o ponto de partida a cada abertura: o modal não é desmontado ao
  // fechar, então sem isto a segunda abertura carregaria o estado da primeira.
  useEffect(() => {
    if (!isOpen) return;
    setFormData(prev => ({
      ...prev,
      ...(initialStatus ? { status: initialStatus } : {}),
      ...(initialProjectId ? { projectId: initialProjectId } : {}),
      ...(initialTitle ? { title: initialTitle } : {}),
    }));
    setPrazoManual(false);
    setPrioridadeManual(false);
  }, [isOpen, initialStatus, initialProjectId, initialTitle]);

  /*
   * Quem vence: o que foi escrito no título ("sexta", "!alta") ou o botão?
   * O ÚLTIMO que a pessoa mexeu. Escreveu "sexta" e depois escolheu outra data
   * no botão: vale o botão. Enquanto o botão não foi tocado, vale o texto.
   */
  const [prazoManual, setPrazoManual] = useState(false);
  const [prioridadeManual, setPrioridadeManual] = useState(false);
  // "Criar outra": a janela fica aberta para uma sequência. Lembrado entre visitas.
  const [criarOutra, setCriarOutra] = useState(lerCriarOutra);
  const tituloRef = React.useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  // Equipe para delegar uma tarefa que não vai para projeto de equipe.
  const [equipeSolta, setEquipeSolta] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const teamProject =
    selectedProject && selectedProject.type === 'team' && selectedProject.teamId
      ? selectedProject
      : null;

  useEffect(() => {
    if (teamProject?.teamId) {
      teamsService.getMembers(teamProject.teamId).then(setMembers).catch(() => setMembers([]));
    } else {
      setMembers([]);
      setAssigneeIds([]);
    }
  }, [teamProject?.teamId]);

  // Lê o título procurando prazo, prioridade e tags. Só reconhece tags que já
  // existem — ver `Opcoes.tagsConhecidas`. Convidado não tem tags, então a
  // lista vazia já faz o parser ignorar todos os "#".
  const interpretado = useMemo(
    () => interpretar(formData.title, new Date(), { tagsConhecidas: tags.map(t => t.name) }),
    [formData.title, tags],
  );

  const projectOptions: OpcaoDaLista[] = [
    { valor: '', rotulo: 'Sem projeto' },
    ...projects.map(p => ({ valor: p.id, rotulo: p.name, cor: p.color })),
  ];

  // O valor que vale agora, já aplicada a regra "o último a mexer vence".
  const prazoEfetivo = prazoManual ? formData.dueDate : interpretado.dueDate ?? formData.dueDate;
  const prioridadeEfetiva = prioridadeManual
    ? formData.priority
    : interpretado.priority ?? formData.priority;


  // Em projeto de equipe, só o dono ou um "gerente de tarefas" pode criar.
  // A lista de membros (já carregada) traz canManageTasks (true para o dono).
  const myMembership = members.find(m => m.userId === account?.id);
  const blockedByPermission =
    !!teamProject && members.length > 0 && !myMembership?.canManageTasks;

  const handleClose = () => {
    setError('');
    setTagIds([]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Dê um título para a tarefa antes de continuar.');
      return;
    }
    // "amanhã !alta" sem mais nada: havia texto, mas nada dele era o título.
    if (!interpretado.title) {
      setError('Faltou dizer o que precisa ser feito, além da data e da prioridade.');
      return;
    }
    if (blockedByPermission) {
      setError('Você não tem permissão para criar tarefas neste projeto de equipe.');
      return;
    }
    // A mesma regra do servidor, antes de ir até ele — contra o prazo que vai
    // valer, que pode ter vindo do texto ("sexta").
    const prazo = prazoEfetivo;
    if (teamProject && formData.startDate && prazo && formData.startDate > prazo) {
      setError('O início não pode ser depois do prazo.');
      return;
    }

    try {
      setLoading(true);
      // O que foi escrito no título vence o que estava nos controles: quem
      // digitou "!alta" acabou de dizer isso, e o seletor está no padrão.
      // As tags do texto SOMAM às escolhidas à mão, em vez de substituir.
      const tagsDoTexto = interpretado.tags
        .map(nome => tags.find(t => t.name === nome)?.id)
        .filter((id): id is string => !!id);
      const tagsFinais = [...new Set([...tagIds, ...tagsDoTexto])];

      const created = await onCreateTask({
        title: interpretado.title,
        description: formData.description || undefined,
        priority: prioridadeEfetiva,
        status: formData.status,
        projectId: formData.projectId || undefined,
        dueDate: prazoEfetivo || undefined,
        // Só com projeto de equipe: é o cronograma que lê o início.
        startDate: teamProject && formData.startDate ? formData.startDate : undefined,
        tagIds: tagsFinais.length ? tagsFinais : undefined,
      });
      // Em projeto de equipe, já nasce com os responsáveis escolhidos.
      if ((teamProject || equipeSolta) && assigneeIds.length && account) {
        await assignTask(
          created.id,
          assigneeIds,
          teamProject ? undefined : equipeSolta ?? undefined,
        );
      }
      setError('');
      toast.success('Tarefa criada.');
      if (criarOutra) {
        // Próxima da sequência: mesmo projeto e status (quem cria várias
        // seguidas costuma criá-las no mesmo lugar); o resto zera.
        setFormData(prev => ({ ...emptyForm, projectId: prev.projectId, status: prev.status }));
        setPrazoManual(false);
        setPrioridadeManual(false);
        setTagIds([]);
        return;
      }
      setFormData(emptyForm);
      setAssigneeIds([]);
      setEquipeSolta(null);
      setTagIds([]);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível criar a tarefa. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
      // Na sequência do "Criar outra", o cursor volta ao título — depois de o
      // campo voltar a ficar habilitado, senão o foco não pega.
      if (criarOutra) requestAnimationFrame(() => tituloRef.current?.focus());
    }
  };

  // Ctrl/⌘+Enter cria de qualquer campo — inclusive da descrição, onde o
  // Enter sozinho quebra linha.
  const formRef = React.useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      const form = formRef.current;
      if (!form || !form.contains(document.activeElement)) return;
      e.preventDefault();
      form.requestSubmit();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen]);

  const atalhoCriar = ehMac(plataformaAtual()) ? '⌘ ↵' : 'Ctrl ↵';
  const prioridade = priorityOptions.find(o => o.valor === prioridadeEfetiva);
  const status = statusOptions.find(o => o.valor === formData.status);
  const projeto = projectOptions.find(o => o.valor === formData.projectId);
  const nomesDasTags = tagIds.map(id => tags.find(t => t.id === id)?.name).filter(Boolean);
  const podeAtribuir = !isGuest && !(teamProject && blockedByPermission);

  const rodape = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Toggle
          checked={criarOutra}
          label="Criar outra em seguida"
          onChange={() => {
            const v = !criarOutra;
            setCriarOutra(v);
            try {
              if (v) localStorage.setItem(CHAVE_CRIAR_OUTRA, '1');
              else localStorage.removeItem(CHAVE_CRIAR_OUTRA);
            } catch {
              /* sem armazenamento: vale só nesta visita */
            }
          }}
          disabled={loading}
        />
        <span aria-hidden="true">Criar outra</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="hidden sm:flex">
          Cancelar
        </Button>
        <Button
          type="submit"
          form="form-nova-tarefa"
          variant="primary"
          isLoading={loading}
          disabled={blockedByPermission}
        >
          Criar tarefa
          <span className="hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold sm:inline">
            {atalhoCriar}
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova tarefa"
      size="lg"
      variante="folha"
      rodape={rodape}
    >
      <form
        id="form-nova-tarefa"
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* O título e a descrição formam UM bloco de escrita: é onde o cursor
            já está quando o modal abre, e digitar + Enter basta para criar. */}
        <div>
          {/* Rótulo pequeno em cima: sem ele, o campo grande parecia o TÍTULO
              do modal, e a pessoa escrevia a tarefa no campo de detalhes logo
              abaixo (reclamação real, 19/09). */}
          <label htmlFor="titulo-da-tarefa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-soft">
            Título da tarefa
          </label>
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <HeadlineInput
                ref={tituloRef}
                id="titulo-da-tarefa"
                name="title"
                aria-label="Título da tarefa"
                placeholder="Ex.: Enviar o relatório para a Ana sexta !alta"
                value={formData.title}
                onChange={e => {
                  set('title', e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="pt-1.5">
              <AjudaDoTitulo />
            </div>
          </div>
          {/* Os valores entendidos já acendem os botões da linha de
              propriedades (em azul); aqui fica só o aviso de que os
              marcadores não vão parar no título. */}
          {(interpretado.dueDate || interpretado.priority || interpretado.tags.length > 0) && (
            <p className="mt-1.5 text-xs text-text-soft">
              Os marcadores saem do título ao salvar: fica “{interpretado.title || '…'}”.
            </p>
          )}
          <NoteField
            name="description"
            aria-label="Descrição da tarefa"
            className="mt-2"
            placeholder="Detalhes, links, o que precisa lembrar… (opcional)"
            value={formData.description}
            onChange={e => set('description', e.target.value)}
            disabled={loading}
          />
        </div>

        {/*
          A linha de propriedades: TODAS numa linha só, cada botão do tamanho
          do próprio valor. Antes eram três linhas (data, prioridade, projeto)
          e o resto escondido em "Mais opções" — status, responsáveis e tags
          ficavam a dois cliques e fora de vista.

          No celular a linha rola de lado em vez de quebrar: a folha fica baixa
          e colada ao teclado, com o campo de título sempre à vista.
        */}
        <div
          role="group"
          aria-label="Propriedades da tarefa"
          className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 pt-3 border-t border-border sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {teamProject && (
            <DatePicker
              value={formData.startDate}
              onChange={v => set('startDate', v)}
              placeholder="Início"
              disabled={loading}
              size="sm"
            />
          )}
          <DatePicker
            value={prazoEfetivo}
            onChange={v => {
              set('dueDate', v);
              setPrazoManual(true);
            }}
            placeholder="Prazo"
            disabled={loading}
            size="sm"
            destaque={!prazoManual && !!interpretado.dueDate}
          />

          <Propriedade
            icone={<Flag size={14} style={{ color: prioridade?.cor }} />}
            rotulo={prioridade?.rotulo ?? 'Prioridade'}
            preenchida
            destaque={!prioridadeManual && !!interpretado.priority}
            nomeAcessivel={`Prioridade: ${prioridade?.rotulo ?? 'média'}`}
            disabled={loading}
            largura={180}
          >
            {fechar => (
              <ListaDeOpcoes
                opcoes={priorityOptions}
                valor={prioridadeEfetiva}
                onEscolher={v => {
                  set('priority', v as TaskPriority);
                  setPrioridadeManual(true);
                  fechar();
                }}
              />
            )}
          </Propriedade>

          <Propriedade
            icone={<FolderOpen size={14} style={projeto?.cor ? { color: projeto.cor } : undefined} />}
            rotulo={formData.projectId ? projeto?.rotulo ?? 'Projeto' : 'Projeto'}
            preenchida={!!formData.projectId}
            nomeAcessivel={`Projeto: ${formData.projectId ? projeto?.rotulo : 'nenhum'}`}
            disabled={loading}
            largura={240}
          >
            {fechar => (
              <ListaDeOpcoes
                opcoes={projectOptions}
                valor={formData.projectId}
                onEscolher={v => {
                  set('projectId', v);
                  fechar();
                }}
              />
            )}
          </Propriedade>

          <Propriedade
            icone={<CircleDashed size={14} style={{ color: status?.cor }} />}
            rotulo={status?.rotulo ?? 'Pendente'}
            preenchida={formData.status !== 'pending'}
            nomeAcessivel={`Começar como: ${status?.rotulo ?? 'pendente'}`}
            disabled={loading}
            largura={190}
          >
            {fechar => (
              <ListaDeOpcoes
                opcoes={statusOptions}
                valor={formData.status}
                onEscolher={v => {
                  set('status', v as TaskStatus);
                  fechar();
                }}
              />
            )}
          </Propriedade>

          {!isGuest && (
            <Propriedade
              icone={<Hash size={14} />}
              rotulo={nomesDasTags.length ? nomesDasTags.slice(0, 2).join(', ') + (nomesDasTags.length > 2 ? ` +${nomesDasTags.length - 2}` : '') : 'Tags'}
              preenchida={tagIds.length > 0}
              nomeAcessivel={`Tags: ${nomesDasTags.length ? nomesDasTags.join(', ') : 'nenhuma'}`}
              disabled={loading}
              largura={300}
            >
              {() => (
                <div className="p-1.5">
                  <TagSelector value={tagIds} onChange={setTagIds} disabled={loading} />
                </div>
              )}
            </Propriedade>
          )}

          {podeAtribuir && (
            <Propriedade
              icone={<UserRound size={14} />}
              rotulo={
                assigneeIds.length
                  ? `${assigneeIds.length} ${assigneeIds.length === 1 ? 'responsável' : 'responsáveis'}`
                  : 'Responsável'
              }
              preenchida={assigneeIds.length > 0}
              nomeAcessivel={`Responsáveis: ${assigneeIds.length || 'nenhum'}`}
              disabled={loading}
              largura={300}
            >
              {() => (
                <div className="p-2">
                  {teamProject ? (
                    <AssigneeSelector
                      members={members}
                      value={assigneeIds}
                      onChange={setAssigneeIds}
                      disabled={loading}
                    />
                  ) : (
                    // Dá para já criar a tarefa delegada, sem projeto nenhum.
                    <DelegarSemProjeto
                      teamId={equipeSolta}
                      onTeamChange={setEquipeSolta}
                      assigneeIds={assigneeIds}
                      onAssigneesChange={setAssigneeIds}
                      disabled={loading}
                    />
                  )}
                </div>
              )}
            </Propriedade>
          )}
        </div>

        {blockedByPermission && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2">
            Você não pode criar tarefas neste projeto de equipe. Peça ao dono para te tornar
            <span className="font-semibold"> gerente de tarefas</span>.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <p className="hidden text-xs text-text-soft sm:block">
          <Kbd>↵</Kbd> no título cria · <Kbd>Esc</Kbd> fecha
        </p>
      </form>
    </Modal>
  );
};
