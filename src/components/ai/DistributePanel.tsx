import React, { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { CommandField, DoneState, Notice, SelectionHeader, SuggestionRow } from './assistantUi';
import { aiService, DistributeResult } from '@/services/aiService';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTasks } from '@/contexts/TasksContext';
import { demoNotice, teamProjectOptions, toggleSelection } from '@/utils/aiAssistant';

/**
 * Distribuir entre a equipe: a IA sugere um responsável para cada tarefa sem
 * dono de um projeto de equipe, olhando a carga atual de cada membro.
 * Aplicar cria uma PROPOSTA (a pessoa ainda aceita ou recusa) — igual ao que
 * acontece quando alguém atribui na mão.
 */
export const DistributePanel: React.FC<{
  onBusyChange: (busy: boolean) => void;
  onHome: () => void;
}> = ({ onBusyChange, onHome }) => {
  const { projects } = useProjects();
  const { refresh } = useTasks();
  const teamProjects = teamProjectOptions(projects);
  const [projectId, setProjectId] = useState('');
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DistributeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  // Com um único projeto de equipe, escolher não é decisão — já vem marcado.
  useEffect(() => {
    if (!projectId && teamProjects.length === 1) setProjectId(teamProjects[0].id);
  }, [projectId, teamProjects]);

  const busy = loading || applying;

  const generate = async () => {
    setLoading(true);
    onBusyChange(true);
    setError(null);
    try {
      const res = await aiService.distribute(projectId, command.trim() || undefined);
      setResult(res);
      setSelected(res.assignments.map(a => a.taskId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  };

  const apply = async () => {
    if (!result) return;
    setApplying(true);
    onBusyChange(true);
    setError(null);
    try {
      const assignments = result.assignments
        .filter(a => selected.includes(a.taskId))
        .map(a => ({ taskId: a.taskId, assigneeId: a.assigneeId }));
      const res = await aiService.applyDistribute(assignments);
      await refresh();
      setDone(
        res.assignedCount === 1
          ? '1 tarefa proposta ao responsável'
          : `${res.assignedCount} tarefas propostas aos responsáveis`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApplying(false);
      onBusyChange(false);
    }
  };

  const restart = () => {
    setResult(null);
    setSelected([]);
    setDone(null);
    setError(null);
  };

  if (done) return <DoneState message={done} onRestart={restart} onHome={onHome} />;

  if (result) {
    const notice = demoNotice(result);
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-primary">{result.summary}</p>
        {notice && <Notice tone="warn">{notice}</Notice>}

        <SelectionHeader
          selected={selected.length}
          total={result.assignments.length}
          onToggleAll={() =>
            setSelected(
              selected.length === result.assignments.length
                ? []
                : result.assignments.map(a => a.taskId),
            )
          }
        />
        <ul className="space-y-2">
          {result.assignments.map(a => (
            <SuggestionRow
              key={a.taskId}
              checked={selected.includes(a.taskId)}
              onToggle={() => setSelected(s => toggleSelection(s, a.taskId))}
              title={a.title}
              reason={a.reason}
              detail={
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus size={12} className="text-text-secondary" />
                  <span className="font-semibold text-primary-vibrant">{a.assigneeName}</span>
                </span>
              }
            />
          ))}
        </ul>

        <Notice>
          Cada pessoa ainda precisa aceitar a tarefa — você está enviando um convite, não
          impondo a atribuição.
        </Notice>

        {error && <Notice tone="warn">{error}</Notice>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" className="flex-1" onClick={restart} disabled={busy}>
            Refazer
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={apply}
            isLoading={applying}
            disabled={busy || selected.length === 0}
          >
            Atribuir {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Eu distribuo as tarefas sem responsável de um projeto de equipe, equilibrando a carga de
        quem já está cheio.
      </p>

      {teamProjects.length === 0 ? (
        <Notice tone="warn">
          Você ainda não tem projeto de equipe. Crie uma equipe e um projeto do tipo “equipe”
          para eu poder distribuir as tarefas.
        </Notice>
      ) : (
        <>
          <Select
            label="Projeto de equipe"
            value={projectId}
            onChange={setProjectId}
            placeholder="Escolha um projeto"
            options={teamProjects.map(p => ({
              value: p.id,
              label: p.teamName ? `${p.name} · ${p.teamName}` : p.name,
            }))}
          />
          <CommandField
            value={command}
            onChange={setCommand}
            placeholder="Ex.: a Ana está de férias, deixe o design com o Léo"
            disabled={busy}
          />
        </>
      )}

      {error && <Notice tone="warn">{error}</Notice>}

      <Button
        className="w-full"
        size="sm"
        icon={<Users size={16} />}
        onClick={generate}
        isLoading={loading}
        disabled={busy || !projectId}
      >
        Sugerir responsáveis
      </Button>
    </div>
  );
};
