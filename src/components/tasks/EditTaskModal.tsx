import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { MoreOptions } from '@/components/common/MoreOptions';
import { Button } from '@/components/common/Button';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { Dropdown } from '@/components/common/Dropdown';
import { AssigneeSelector } from './AssigneeSelector';
import { DelegarSemProjeto } from './DelegarSemProjeto';
import { DatePicker } from '@/components/common/DatePicker';
import { TagSelector } from './TagSelector';
import { Task, TaskPriority, TaskStatus, TaskUpdate } from '@/types/task';
import { TeamMember } from '@/types/team';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';

interface EditTaskModalProps {
  isOpen: boolean;
  task?: Task;
  onClose: () => void;
  onUpdateTask: (id: string, updates: TaskUpdate) => Promise<Task | undefined>;
  /**
   * Mostra o "Depois de" — a tarefa desta equipe que precisa fechar antes.
   *
   * Vem de fora porque encadear é gestão (o servidor recusa membro comum), e
   * só a área de Equipe sabe o papel de quem está editando. Aberto de outro
   * lugar, o campo não aparece: a dependência se define onde se vê a linha
   * do tempo.
   */
  podeEncadear?: boolean;
}

const priorityOptions: SelectableOption[] = [
  { value: 'low', label: 'Baixa', color: '#22C55E', dot: true },
  { value: 'medium', label: 'Média', color: '#FBBF24', dot: true },
  { value: 'high', label: 'Alta', color: '#8B5CF6', dot: true },
];

const statusOptions: SelectableOption[] = [
  { value: 'pending', label: 'Pendente', color: '#64748B' },
  { value: 'in_progress', label: 'Em progresso', color: '#2477FF' },
  { value: 'completed', label: 'Concluída', color: '#22C55E' },
];

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdateTask,
  podeEncadear = false,
}) => {
  const { projects } = useProjects();
  const { assignTask } = useTasks();
  const { account, isGuest } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  // Equipe escolhida para delegar uma tarefa SEM projeto. Começa na que a
  // tarefa já tem, se tiver.
  const [equipeSolta, setEquipeSolta] = useState<string | null>(task?.teamId ?? null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  // As tarefas abertas da equipe, para o "Depois de". Só são pedidas quando
  // o campo vai aparecer.
  const [tarefasDaEquipe, setTarefasDaEquipe] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    projectId: '',
    dueDate: '',
    startDate: '',
    dependsOnId: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status === 'overdue' ? 'pending' : task.status,
        projectId: task.projectId || '',
        dueDate: task.dueDate || '',
        startDate: task.startDate || '',
        dependsOnId: task.dependsOnId || '',
      });
      setAssigneeIds((task.assignees ?? []).map(a => a.id));
      setTagIds((task.tags ?? []).map(t => t.id));
      setError('');
    }
  }, [task, isOpen]);

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
    }
  }, [teamProject?.teamId]);

  /**
   * De equipe: pelo projeto escolhido agora, ou porque a tarefa já era (uma
   * delegada sem projeto). É o que decide se "Início" aparece — início e
   * dependência só existem para o cronograma da equipe.
   */
  const equipeId = teamProject?.teamId ?? task?.teamId ?? null;
  const mostrarEncadear = podeEncadear && !!equipeId;

  useEffect(() => {
    if (!mostrarEncadear || !equipeId) {
      setTarefasDaEquipe([]);
      return;
    }
    teamsService.getTasks(equipeId).then(setTarefasDaEquipe).catch(() => setTarefasDaEquipe([]));
  }, [mostrarEncadear, equipeId]);

  /**
   * Candidatas a mãe: as abertas da equipe, menos esta. Uma mãe já fechada
   * não seguraria nada — e a que está guardada continua na lista mesmo se
   * fechou, para o campo não parecer vazio enquanto o vínculo ainda existe.
   */
  const opcoesDeMae: SelectableOption[] = [
    { value: '', label: 'Nenhuma' },
    ...tarefasDaEquipe
      .filter(t => t.id !== task?.id && (!t.teamCompleted || t.id === formData.dependsOnId))
      .sort((a, b) => (a.projectId ?? '').localeCompare(b.projectId ?? '') || a.title.localeCompare(b.title))
      .map(t => {
        const projeto = projects.find(p => p.id === t.projectId);
        return { value: t.id, label: t.title, color: projeto?.color, dot: !!projeto };
      }),
  ];

  const projectOptions: SelectableOption[] = [
    { value: '', label: 'Sem projeto' },
    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color, dot: true })),
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Dê um título para a tarefa antes de continuar.');
      return;
    }
    if (!task) return;
    // A mesma regra do servidor, antes de ir até ele: o erro no campo é
    // melhor que o erro do PATCH.
    if (formData.startDate && formData.dueDate && formData.startDate > formData.dueDate) {
      setError('O início não pode ser depois do prazo.');
      return;
    }

    try {
      setLoading(true);
      await onUpdateTask(task.id, {
        title: formData.title.trim(),
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || undefined,
        dueDate: formData.dueDate || undefined,
        // Início vai como está — '' limpa. Só em tarefa de equipe: fora dela
        // o campo nem aparece, e mandá-lo vazio apagaria sem a pessoa ver.
        ...(equipeId ? { startDate: formData.startDate } : {}),
        // `null` desfaz; ausente não mexe. Só quando o campo esteve na tela.
        ...(mostrarEncadear ? { dependsOnId: formData.dependsOnId || null } : {}),
        // Sempre envia (mesmo []) para o backend substituir o conjunto de tags.
        ...(isGuest ? {} : { tagIds }),
      });
      /**
       * Reconcilia a lista de responsáveis.
       *
       * Compara conjuntos, não igualdade de array: marcar A depois B produz a
       * mesma lista que B depois A, e salvar por diferença de ordem geraria
       * uma escrita — e um push para quem já era responsável.
       */
      const atuais = (task.assignees ?? []).map(a => a.id);
      const mudou =
        atuais.length !== assigneeIds.length ||
        [...atuais].sort().join(',') !== [...assigneeIds].sort().join(',');

      // Com projeto de equipe o time vem do projeto; sem ele, da escolha
      // acima. O servidor ignora o `teamId` no primeiro caso.
      const podeAtribuir = teamProject || equipeSolta;
      if (podeAtribuir && mudou && account) {
        await assignTask(task.id, assigneeIds, teamProject ? undefined : equipeSolta ?? undefined);
      } else if (!teamProject && atuais.length > 0) {
        // Saiu de um projeto de equipe: fora da equipe não há a quem atribuir.
        await assignTask(task.id, []);
      }
      toast.success('Alterações salvas.');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar as alterações. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // O que está definido atrás do "mais opções" — decide o contador e, na
  // edição, se o bloco já nasce aberto.
  const ajustesDefinidos =
    (formData.status !== 'pending' ? 1 : 0) +
    (assigneeIds.length ? 1 : 0) +
    (formData.dependsOnId ? 1 : 0) +
    tagIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar tarefa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mesma estrutura da criação, de propósito: editar e criar são a mesma
            tarefa vista duas vezes, e dar duas caras a ela é o que fazia a
            edição parecer outro produto. */}
        <div>
          <label htmlFor="titulo-da-tarefa-edicao" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-soft">
            Título da tarefa
          </label>
          <HeadlineInput
            id="titulo-da-tarefa-edicao"
            name="title"
            aria-label="Título da tarefa"
            placeholder="Ex.: Enviar o relatório para a Ana"
            value={formData.title}
            onChange={e => {
              set('title', e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
            maxLength={200}
            autoFocus
          />
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

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
          {/* Início antes do prazo, na ordem em que acontecem. Só em tarefa de
              equipe: é o cronograma que lê este campo. */}
          {equipeId && (
            <DatePicker
              value={formData.startDate}
              onChange={v => {
                set('startDate', v);
                if (error) setError('');
              }}
              placeholder="Sem início"
              disabled={loading}
              size="sm"
            />
          )}
          <DatePicker
            value={formData.dueDate}
            onChange={v => {
              set('dueDate', v);
              if (error) setError('');
            }}
            placeholder="Sem data"
            disabled={loading}
            size="sm"
          />
          <OptionSelector
            options={priorityOptions}
            value={formData.priority}
            onChange={v => set('priority', v as TaskPriority)}
            disabled={loading}
            size="sm"
          />
          <Dropdown
            options={projectOptions}
            value={formData.projectId}
            onChange={v => set('projectId', v)}
            placeholder="Sem projeto"
            size="sm"
            disabled={loading}
          />
        </div>

        {/* Na edição o bloco abre sozinho quando já há algo definido lá dentro:
            esconder um responsável ou uma tag que a pessoa mesma escolheu
            pareceria que a tarefa os perdeu. */}
        <MoreOptions
          key={task?.id}
          activeCount={ajustesDefinidos}
          defaultOpen={ajustesDefinidos > 0}
        >
          <OptionSelector
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={v => set('status', v as TaskStatus)}
            layout="grid"
            columns={3}
            disabled={loading}
          />

          {teamProject ? (
            <AssigneeSelector
              members={members}
              value={assigneeIds}
              onChange={setAssigneeIds}
              disabled={loading}
            />
          ) : (
            // Sem projeto de equipe, a equipe é escolhida aqui — é o caminho
            // de delegar algo solto, que antes exigia criar um projeto.
            <DelegarSemProjeto
              teamId={equipeSolta}
              onTeamChange={setEquipeSolta}
              assigneeIds={assigneeIds}
              onAssigneesChange={setAssigneeIds}
              disabled={loading}
            />
          )}

          {mostrarEncadear && (
            <Dropdown
              label="Depois de"
              options={opcoesDeMae}
              value={formData.dependsOnId}
              onChange={v => set('dependsOnId', v)}
              placeholder="Nenhuma"
              fullWidth
              disabled={loading}
            />
          )}

          {!isGuest && <TagSelector value={tagIds} onChange={setTagIds} disabled={loading} />}
        </MoreOptions>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
};
