/**
 * Matemática da grade mensal (MonthGrid), separada do componente para poder
 * ser testada sem navegador. Tudo aqui trabalha com datas LOCAIS — a grade
 * fala de dias do calendário, não de instantes.
 */

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/**
 * As 6 semanas exibidas para o mês de `month`, começando no domingo anterior
 * (ou no próprio dia 1, quando ele já cai num domingo).
 *
 * Sempre 6 linhas, mesmo quando o mês cabe em 5: com a altura variável,
 * trocar de mês fazia o cartão e o painel ao lado pularem. As sobras são os
 * dias vizinhos, que a grade desenha apagados.
 */
export function monthWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );
}

/**
 * Mesmo dia, `delta` meses depois — grudando no último dia quando o mês de
 * destino é mais curto. Sem o corte, o `Date` transborda: 31 de março menos um
 * mês vira "31 de fevereiro", que o JS normaliza para 3 de março. Ou seja,
 * PageUp em 31/03 caía em 03/03 — mesmo mês, dois dias depois do esperado.
 */
export function shiftMonth(date: Date, delta: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}
