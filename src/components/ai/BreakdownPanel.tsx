import React, { useMemo, useState } from 'react';
import { Split } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { CommandField, DoneState, Notice, SelectionHeader, SuggestionRow } from './assistantUi';
import { aiService, BreakdownResult } from '@/services/aiService';
import { useTasks } from '@/contexts/TasksContext';
import {
  breakdownTargets,
  dayLabel,
  demoNotice,
  priorityLabel,
  toggleSelection,
} from '@/utils/aiAssistant';

/**
 * Quebrar uma tarefa: a IA propõe de 3 a 6 subtarefas executáveis. Elas nascem
 * no MESMO projeto da tarefa original, que não é alterada nem excluída — o que
 * fazer com ela continua sendo decisão do usuário.
 */
export const BreakdownPanel: React.FC<{
  onBusyChange: (busy: boolean) => void;
  onHome: () => void;
  /** Tarefa pré-selecionada (quando o Bob é aberto a partir de uma tarefa). */
  initialTaskId?: string;
}> = ({ onBusyChange, onHome, initialTaskId }) => {
  const { tasks, refresh } = useTasks();
  const options = useMemo(() => breakdownTargets(tasks), [tasks]);
  const [taskId, setTaskId] = useState(initialTaskId ?? '');
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BreakdownResult | null>(null);
  // Aqui a seleção é por índice: as subtarefas ainda não existem, não têm id.
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const busy = loading || applying;

  const generate = async () => {
    setLoading(true);
    onBusyChange(true);
    setError(null);
    try {
      const res = await aiService.breakdown(taskId, command.trim() || undefined);
      setResult(res);
      setSelected(res.cards.map((_, i) => String(i)));
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
      const cards = result.cards
        .filter((_, i) => selected.includes(String(i)))
        .map(c => ({
          title: c.title,
          description: c.description,
          priority: c.priority,
          dueDate: c.dueDate,
          tagIds: c.tags.map(t => t.id),
        }));
      const res = await aiService.applyBreakdown(result.parent.id, cards);
      await refresh();
      setDone(
        res.createdCount === 1 ? '1 subtarefa criada' : `${res.createdCount} subtarefas criadas`,
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
        <p className="text-sm text-text-primary">
          Passos para <span className="font-semibold">{result.parent.title}</span>:
        </p>
        {notice && <Notice tone="warn">{notice}</Notice>}

        <SelectionHeader
          selected={selected.length}
          total={result.cards.length}
          onToggleAll={() =>
            setSelected(
              selected.length === result.cards.length ? [] : result.cards.map((_, i) => String(i)),
            )
          }
        />
        <ul className="space-y-2">
          {result.cards.map((card, i) => (
            <SuggestionRow
              key={`${card.title}-${i}`}
              checked={selected.includes(String(i))}
              onToggle={() => setSelected(s => toggleSelection(s, String(i)))}
              title={`${i + 1}. ${card.title}`}
              detail={
                <>
                  {card.description}
                  <span className="mt-1 block text-text-soft">
                    {priorityLabel[card.priority]}
                    {card.dueDate && ` · ${dayLabel(card.dueDate)}`}
                  </span>
                </>
              }
            >
              {card.tags.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {card.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </span>
              )}
            </SuggestionRow>
          ))}
        </ul>

        <Notice>
          A tarefa original continua como está — você decide se conclui ou apaga depois.
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
            Criar {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Escolha uma tarefa grande demais para começar e eu quebro ela em passos menores, com
        prazo e tags.
      </p>

      {options.length === 0 ? (
        <Notice tone="warn">Nenhuma tarefa aberta para quebrar. Crie uma tarefa primeiro.</Notice>
      ) : (
        <>
          <Select
            label="Tarefa"
            value={taskId}
            onChange={setTaskId}
            placeholder="Escolha uma tarefa"
            options={options.map(t => ({
              value: t.id,
              label: t.dueDate ? `${t.title} · ${dayLabel(t.dueDate)}` : t.title,
            }))}
          />
          <CommandField
            value={command}
            onChange={setCommand}
            placeholder="Ex.: preciso entregar antes da reunião de quinta"
            disabled={busy}
          />
        </>
      )}

      {error && <Notice tone="warn">{error}</Notice>}

      <Button
        className="w-full"
        size="sm"
        icon={<Split size={16} />}
        onClick={generate}
        isLoading={loading}
        disabled={busy || !taskId}
      >
        Quebrar em subtarefas
      </Button>
    </div>
  );
};
