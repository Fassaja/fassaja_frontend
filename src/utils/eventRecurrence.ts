// Lógica pura da recorrência semanal da Agenda (sem React/DOM — fácil de testar).
// Um evento "rotineiro" se repete nos dias da semana escolhidos; aqui geramos
// as datas concretas (YYYY-MM-DD) em que ele deve acontecer.

// Formata uma Date local como 'YYYY-MM-DD' (mesma lógica de utils/date).
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Dias da semana na ordem do calendário (getDay(): 0=Dom .. 6=Sáb).
export interface WeekdayOption {
  value: number; // índice de Date.getDay()
  short: string; // letra exibida no seletor
  label: string; // nome completo (acessibilidade)
}

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 0, short: 'D', label: 'Domingo' },
  { value: 1, short: 'S', label: 'Segunda' },
  { value: 2, short: 'T', label: 'Terça' },
  { value: 3, short: 'Q', label: 'Quarta' },
  { value: 4, short: 'Q', label: 'Quinta' },
  { value: 5, short: 'S', label: 'Sexta' },
  { value: 6, short: 'S', label: 'Sábado' },
];

export interface RepeatOption {
  value: string; // semanas como texto
  label: string;
  weeks: number;
}

export const REPEAT_OPTIONS: RepeatOption[] = [
  { value: '1', label: 'Por 1 semana', weeks: 1 },
  { value: '2', label: 'Por 2 semanas', weeks: 2 },
  { value: '3', label: 'Por 3 semanas', weeks: 3 },
  { value: '4', label: 'Por 1 mês', weeks: 4 },
  { value: '12', label: 'Por 3 meses', weeks: 12 },
  { value: '26', label: 'Por 6 meses', weeks: 26 },
  { value: '52', label: 'Por 1 ano', weeks: 52 },
];

// Padrão do seletor: horizonte curto, para ninguém sair repetindo por meses sem
// perceber. Quem quiser mais tempo escolhe na lista.
export const DEFAULT_REPEAT_VALUE = REPEAT_OPTIONS[0].value; // 1 semana

// Trava de segurança: nunca gerar uma enxurrada de eventos numa única ação.
export const MAX_RECURRENCE_DATES = 366;

/**
 * Datas (YYYY-MM-DD) de um evento repetido nos dias da semana escolhidos,
 * a partir de `startDate` (inclusivo) por `weeks` semanas.
 *
 * Sem dias selecionados, devolve apenas a própria data (evento único).
 */
export function expandWeekdayDates(
  startDate: string,
  weekdays: number[],
  weeks: number,
): string[] {
  if (weekdays.length === 0) return [startDate];

  const [y, m, d] = startDate.split('-').map(Number);
  if (!y || !m || !d) return [startDate];

  const set = new Set(weekdays);
  const cursor = new Date(y, m - 1, d);
  if (Number.isNaN(cursor.getTime())) return [startDate];

  const end = new Date(cursor);
  end.setDate(end.getDate() + Math.max(0, weeks) * 7);

  const dates: string[] = [];
  while (cursor <= end && dates.length < MAX_RECURRENCE_DATES) {
    if (set.has(cursor.getDay())) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.length ? dates : [startDate];
}
