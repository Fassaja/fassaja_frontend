import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { Button } from '@/components/common/Button';
import { type OpcaoDaLista } from '@/components/common/Propriedade';
import { AssigneeSelector } from './AssigneeSelector';
import { DelegarSemProjeto } from './DelegarSemProjeto';
import { LinhaDePropriedades } from './LinhaDePropriedades';
import { useCtrlEnter } from '@/hooks/useCtrlEnter';
import { ehMac, plataformaAtual } from '@/utils/atalhos';
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
  const opcoesDeMae: OpcaoDaLista[] = [
    { valor: '', rotulo: 'Nenhuma' },
    ...tarefasDaEquipe
      .filter(t => t.id !== task?.id && (!t.teamCompleted || t.id === formData.dependsOnId))
      .sort((a, b) => (a.projectId ?? '').localeCompare(b.projectId ?? '') || a.title.localeCompare(b.title))
      .map(t => {
        const projeto = projects.find(p => p.id === t.projectId);
        return { valor: t.id, rotulo: t.title, cor: projeto?.color };
      }),
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
        // '' limpa os detalhes. Com `|| undefined` a chave sumia do JSON e o
        // servidor lia "não mexa" — apagar o texto simplesmente não salvava.
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        /*
         * Projeto e prazo só vão quando MUDARAM, e aí `null`/`''` apagam.
         *
         * Mandar sempre não é inofensivo: no servidor, trocar o projeto é
         * operação de gestão e mexer no prazo de uma tarefa que se repete
         * também. Reenviar o mesmo valor jogaria uma edição comum contra
         * essas travas sem necessidade — e '' contra um prazo já vazio
         * contaria como mudança, porque lá ele é nulo, não ''.
         */
        ...(formData.projectId !== (task.projectId ?? '')
          ? { projectId: formData.projectId || null }
          : {}),
        ...(formData.dueDate !== (task.dueDate ?? '') ? { dueDate: formData.dueDate } : {}),
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

  // Ctrl/⌘+Enter salva de qualquer campo (ver useCtrlEnter).
  const formRef = React.useRef<HTMLFormElement>(null);
  useCtrlEnter(formRef, isOpen);
  const atalhoSalvar = ehMac(plataformaAtual()) ? '⌘ ↵' : 'Ctrl ↵';

  const rodape = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button type="submit" form="form-editar-tarefa" variant="primary" isLoading={loading}>
        Salvar alterações
        <span className="hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold sm:inline">
          {atalhoSalvar}
        </span>
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar tarefa"
      size="lg"
      variante="folha"
      rodape={rodape}
    >
      <form id="form-editar-tarefa" ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Mesma estrutura da criação, de propósito: editar e criar são a mesma
            tarefa vista duas vezes, e dar duas caras a ela é o que fazia a
            edição parecer outro produto. A linha de propriedades é literalmente
            o mesmo componente (LinhaDePropriedades). */}
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

        {/* Na edição tudo fica à vista, inclusive responsáveis, tags e
            "Depois de": antes eles moravam atrás de "Mais opções", e um
            responsável escondido parecia ter sido perdido pela tarefa. */}
        <LinhaDePropriedades
          disabled={loading}
          inicio={
            equipeId
              ? {
                  valor: formData.startDate,
                  onMudar: v => {
                    set('startDate', v);
                    if (error) setError('');
                  },
                }
              : undefined
          }
          prazo={formData.dueDate}
          onPrazo={v => {
            set('dueDate', v);
            if (error) setError('');
          }}
          prioridade={formData.priority}
          onPrioridade={v => set('priority', v)}
          projetoId={formData.projectId}
          onProjeto={v => set('projectId', v)}
          status={formData.status}
          onStatus={v => set('status', v)}
          tags={isGuest ? undefined : { ids: tagIds, onMudar: setTagIds }}
          responsaveis={
            isGuest
              ? undefined
              : {
                  quantidade: assigneeIds.length,
                  painel: teamProject ? (
                    <AssigneeSelector
                      members={members}
                      value={assigneeIds}
                      onChange={setAssigneeIds}
                      disabled={loading}
                    />
                  ) : (
                    // Sem projeto de equipe, a equipe é escolhida aqui — é o
                    // caminho de delegar algo solto.
                    <DelegarSemProjeto
                      teamId={equipeSolta}
                      onTeamChange={setEquipeSolta}
                      assigneeIds={assigneeIds}
                      onAssigneesChange={setAssigneeIds}
                      disabled={loading}
                    />
                  ),
                }
          }
          depoisDe={
            mostrarEncadear
              ? { opcoes: opcoesDeMae, valor: formData.dependsOnId, onMudar: v => set('dependsOnId', v) }
              : undefined
          }
        />

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
};
