import React, { useMemo, useState } from 'react';
import { Spade, X, Trash2 } from 'lucide-react';
import { Task } from '@/types/task';
import { Card } from '@/components/common/Card';
import { Dropdown } from '@/components/common/Dropdown';
import { usePokerEstimates } from '@/hooks/usePokerEstimates';

interface PlanningPokerViewProps {
  tasks: Task[];
}

// Baralho de Fibonacci clássico do Planning Poker.
const DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?'];

export const PlanningPokerView: React.FC<PlanningPokerViewProps> = ({ tasks }) => {
  const { estimates, setEstimate, clearEstimate } = usePokerEstimates();
  const estimable = useMemo(() => tasks.filter(t => t.status !== 'completed'), [tasks]);
  const [selectedId, setSelectedId] = useState<string>(() => estimable[0]?.id ?? '');

  // Se a tarefa selecionada sumiu (concluída/excluída), cai na primeira disponível.
  const selected = estimable.find(t => t.id === selectedId) ?? estimable[0];
  const currentValue = selected ? estimates[selected.id] : undefined;

  const estimatedRows = useMemo(
    () =>
      Object.entries(estimates)
        .map(([id, value]) => ({ task: tasks.find(t => t.id === id), value, id }))
        .filter(r => r.task) as { task: Task; value: string; id: string }[],
    [estimates, tasks],
  );

  const numericValues = estimatedRows
    .map(r => Number(r.value))
    .filter(n => Number.isFinite(n));
  const totalPoints = numericValues.reduce((sum, n) => sum + n, 0);
  const average = numericValues.length
    ? Math.round((totalPoints / numericValues.length) * 10) / 10
    : 0;
  const pendingCount = estimable.filter(t => estimates[t.id] === undefined).length;

  if (estimable.length === 0) {
    return (
      <Card className="flex flex-col items-center text-center py-12">
        <Spade size={36} className="text-text-soft" />
        <p className="text-text-primary font-semibold mt-3">Nenhuma tarefa para estimar</p>
        <p className="text-text-secondary text-sm max-w-sm">
          Crie tarefas (ainda não concluídas) para estimar o esforço de cada uma com as cartas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        <strong className="text-text-primary">Planning Poker</strong> estima o esforço de cada tarefa
        usando os números de Fibonacci: quanto maior a carta, maior o esforço. Escolha uma tarefa e
        clique numa carta. As estimativas ficam salvas neste navegador.
      </p>

      {/* Resumo das estimativas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-text-primary">{estimatedRows.length}</p>
          <p className="text-xs text-text-secondary">Estimadas</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-text-secondary">Sem estimativa</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-primary-vibrant">{average || '—'}</p>
          <p className="text-xs text-text-secondary">Média (pts)</p>
        </Card>
      </div>

      {/* Mesa de estimativa */}
      <Card>
        <label className="block text-sm font-semibold text-text-primary mb-2">Tarefa</label>
        <Dropdown
          options={estimable.map(t => ({ value: t.id, label: t.title }))}
          value={selected?.id ?? ''}
          onChange={setSelectedId}
          fullWidth
        />

        <div className="mt-5 flex flex-wrap gap-2.5">
          {DECK.map(card => {
            const active = currentValue === card;
            return (
              <button
                key={card}
                onClick={() => selected && setEstimate(selected.id, card)}
                aria-pressed={active}
                className={`w-14 h-20 rounded-xl border-2 flex items-center justify-center text-xl font-extrabold transition-all active:scale-95 ${
                  active
                    ? 'border-primary-vibrant bg-primary-vibrant text-white shadow-md -translate-y-1'
                    : 'border-border bg-white text-text-primary hover:border-primary-vibrant hover:-translate-y-0.5'
                }`}
              >
                {card}
              </button>
            );
          })}
        </div>

        {currentValue !== undefined && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Estimativa atual:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-primary-vibrant">
              {currentValue} {currentValue === '1' ? 'ponto' : 'pontos'}
            </span>
            <button
              onClick={() => selected && clearEstimate(selected.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-danger transition-colors ml-1"
            >
              <X size={14} /> limpar
            </button>
          </div>
        )}
      </Card>

      {/* Resumo das estimativas */}
      {estimatedRows.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-bold text-text-primary">Estimativas</h3>
            <span className="text-sm font-semibold text-text-secondary">
              Total: <span className="text-primary-vibrant">{totalPoints} pts</span>
            </span>
          </div>
          <ul className="divide-y divide-border">
            {estimatedRows.map(row => (
              <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex-1 min-w-0 text-sm text-text-primary truncate">
                  {row.task.title}
                </span>
                <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-lg bg-primary-light text-primary-vibrant font-bold text-sm shrink-0">
                  {row.value}
                </span>
                <button
                  onClick={() => clearEstimate(row.id)}
                  aria-label="Remover estimativa"
                  className="p-1.5 rounded-lg text-text-soft hover:text-danger hover:bg-rose-50 transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
