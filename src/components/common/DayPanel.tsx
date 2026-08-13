import React from 'react';
import { Card } from '@/components/common/Card';

interface DayPanelProps {
  /** Data selecionada — vira o título ("quarta-feira, 13 de agosto"). */
  date: Date;
  /** Quantos itens há no dia; decide o subtítulo e não é recalculado aqui. */
  count: number;
  /** Nome do que está sendo contado, no singular ("tarefa", "evento"). */
  noun: string;
  onToday: () => void;
  /** Lista do dia. Quando `count` é 0, o `empty` é exibido no lugar. */
  children?: React.ReactNode;
  empty: React.ReactNode;
}

/**
 * Cabeçalho + moldura do painel lateral do dia, compartilhado por Calendário e
 * Agenda. As duas páginas tinham este bloco copiado linha a linha (título com
 * a data por extenso, contagem, botão "Hoje"); qualquer ajuste em uma esquecia
 * a outra. O conteúdo continua sendo de cada página — o que se compartilha é a
 * moldura, não a lista.
 */
export const DayPanel: React.FC<DayPanelProps> = ({
  date,
  count,
  noun,
  onToday,
  children,
  empty,
}) => {
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-text-primary capitalize leading-tight">
            {date.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {count === 0
              ? `Nenhum ${noun} nesta data`
              : `${count} ${noun}${count === 1 ? '' : 's'}`}
          </p>
        </div>
        {/* Sem função quando já se está em hoje: escondido em vez de desabilitado,
            para não deixar um controle morto ocupando o canto. */}
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-vibrant bg-primary-light hover:brightness-95 active:scale-95 transition-all"
          >
            Hoje
          </button>
        )}
      </div>

      {count > 0 ? children : empty}
    </Card>
  );
};
