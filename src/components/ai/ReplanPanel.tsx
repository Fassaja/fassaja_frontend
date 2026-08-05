import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { CommandField, DoneState, Notice, SelectionHeader, SuggestionRow } from './assistantUi';
import { aiService, ReplanResult } from '@/services/aiService';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTasks } from '@/contexts/TasksContext';
import {
  appliedLabel,
  demoNotice,
  describeChange,
  openTaskCount,
  toggleSelection,
} from '@/utils/aiAssistant';

/**
 * Replanejar a semana: a IA olha as tarefas abertas + a agenda e propõe novos
 * prazos. Nada é gravado até o usuário marcar o que aceita e confirmar.
 */
export const ReplanPanel: React.FC<{
  onBusyChange: (busy: boolean) => void;
  onHome: () => void;
}> = ({ onBusyChange, onHome }) => {
  const { projects } = useProjects();
  const { tasks, refresh } = useTasks();
  const [projectId, setProjectId] = useState('');
  const [horizon, setHorizon] = useState('7');
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplanResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const eligible = useMemo(
    () => openTaskCount(tasks, projectId || undefined),
    [tasks, projectId],
  );

  const busy = loading || applying;

  const generate = async () => {
    setLoading(true);
    onBusyChange(true);
    setError(null);
    try {
      const res = await aiService.replan({
        horizonDays: Number(horizon),
        projectId: projectId || undefined,
        command: command.trim() || undefined,
      });
      setResult(res);
      // Tudo marcado por padrão: o caminho comum é aceitar o plano inteiro.
      setSelected(res.changes.map(c => c.taskId));
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
      const changes = result.changes
        .filter(c => selected.includes(c.taskId))
        .map(c => ({ taskId: c.taskId, dueDate: c.suggestedDueDate }));
      const res = await aiService.applyReplan(changes);
      await refresh();
      setDone(appliedLabel(res.updatedCount, 'tarefa'));
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

        {result.changes.length === 0 ? (
          <Notice>
            Seus prazos já estão bem distribuídos — nenhuma mudança a propor.
          </Notice>
        ) : (
          <>
            <SelectionHeader
              selected={selected.length}
              total={result.changes.length}
              onToggleAll={() =>
                setSelected(
                  selected.length === result.changes.length
                    ? []
                    : result.changes.map(c => c.taskId),
                )
              }
            />
            <ul className="space-y-2">
              {result.changes.map(change => {
                const { from, to, wasLate } = describeChange(change);
                return (
                  <SuggestionRow
                    key={change.taskId}
                    checked={selected.includes(change.taskId)}
                    onToggle={() => setSelected(s => toggleSelection(s, change.taskId))}
                    title={change.title}
                    reason={change.reason}
                    detail={
                      <span className="inline-flex items-center gap-1.5">
                        <span className={wasLate ? 'font-semibold text-danger' : ''}>{from}</span>
                        <ArrowRight size={12} className="text-text-secondary" />
                        <span className="font-semibold text-primary-vibrant">{to}</span>
                      </span>
                    }
                  />
                );
              })}
            </ul>
          </>
        )}

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
            Aplicar {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Eu olho suas tarefas abertas e sua agenda e proponho novos prazos, espalhando a carga
        pelos próximos dias.
      </p>

      <Select
        label="Quais tarefas"
        value={projectId}
        onChange={setProjectId}
        options={[
          { value: '', label: 'Todas as minhas tarefas' },
          ...projects.map(p => ({ value: p.id, label: p.name })),
        ]}
      />
      <Select
        label="Período"
        value={horizon}
        onChange={setHorizon}
        options={[
          { value: '7', label: 'Próximos 7 dias' },
          { value: '14', label: 'Próximos 14 dias' },
          { value: '21', label: 'Próximos 21 dias' },
        ]}
      />
      <CommandField
        value={command}
        onChange={setCommand}
        placeholder="Ex.: nada na sexta, prefiro entregas pela manhã"
        disabled={busy}
      />

      {eligible === 0 ? (
        <Notice tone="warn">
          Nenhuma tarefa aberta aqui para replanejar. Crie uma tarefa primeiro.
        </Notice>
      ) : (
        <p className="px-1 text-xs text-text-secondary">
          {eligible} {eligible === 1 ? 'tarefa aberta' : 'tarefas abertas'} entram na conta.
        </p>
      )}

      {error && <Notice tone="warn">{error}</Notice>}

      <Button
        className="w-full"
        size="sm"
        icon={<CalendarClock size={16} />}
        onClick={generate}
        isLoading={loading}
        disabled={busy || eligible === 0}
      >
        Replanejar
      </Button>
    </div>
  );
};
