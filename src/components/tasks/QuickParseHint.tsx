import React from 'react';
import { Calendar, Flag, Hash } from 'lucide-react';
import { Interpretado } from '@/utils/quickParse';
import { formatDateWithDay } from '@/utils/date';

const ROTULO_PRIORIDADE: Record<NonNullable<Interpretado['priority']>, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/**
 * Mostra o que foi entendido no que a pessoa está digitando.
 *
 * De propósito NÃO reescreve o campo enquanto ela escreve: apagar "amanhã" do
 * texto no meio da digitação faz o cursor pular e assusta. Aqui ela vê o que
 * vai acontecer e só acontece ao salvar — se não era o que queria, é só apagar
 * a palavra.
 */
/**
 * Mostra o que foi entendido no que a pessoa está digitando.
 *
 * Só isso: o ENSINO de como escrever saiu daqui para o "?" ao lado do campo
 * (AjudaDoTitulo). Uma linha fixa de instrução cobrava a leitura em toda
 * criação de tarefa, inclusive de quem já sabe, e empurrava o formulário para
 * baixo num modal já cheio.
 */
export const QuickParseHint: React.FC<{ resultado: Interpretado }> = ({ resultado }) => {
  const { dueDate, priority, tags } = resultado;

  if (!dueDate && !priority && tags.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {dueDate && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light/60 text-primary-vibrant px-2 py-1 font-semibold">
          <Calendar size={12} /> {formatDateWithDay(dueDate)}
        </span>
      )}
      {priority && (
        <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary text-text-primary border border-border px-2 py-1 font-semibold">
          <Flag size={12} /> {ROTULO_PRIORIDADE[priority]}
        </span>
      )}
      {tags.map(t => (
        <span
          key={t}
          className="inline-flex items-center gap-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border px-2 py-1 font-semibold"
        >
          <Hash size={12} /> {t}
        </span>
      ))}
      <span className="text-text-soft">sai do título ao salvar</span>
    </div>
  );
};
