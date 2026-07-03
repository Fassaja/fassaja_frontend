// Lógica pura da sequência produtiva (sem React) — testável em Node.

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO(): string {
  return isoOf(new Date());
}

/**
 * Maior sequência de dias consecutivos terminando hoje (ou ontem, se hoje
 * ainda não teve conclusão). `activeWeekdays` (0=dom … 6=sáb) define os dias
 * que contam: um dia de folga sem conclusão não quebra a sequência (mas, se
 * houver conclusão nele, conta a favor).
 */
export function computeStreak(days: string[], activeWeekdays?: number[]): number {
  const set = new Set(days);
  if (set.size === 0) return 0;
  const required = new Set(
    activeWeekdays && activeWeekdays.length > 0 ? activeWeekdays : [0, 1, 2, 3, 4, 5, 6],
  );
  const earliest = Array.from(set).sort()[0];
  const cursor = new Date();
  // Hoje ainda não acabou: sem conclusão hoje, a sequência é avaliada até ontem.
  if (!set.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (true) {
    const iso = isoOf(cursor);
    if (iso < earliest) break;
    if (set.has(iso)) {
      streak += 1;
    } else if (required.has(cursor.getDay())) {
      break; // dia de trabalho sem conclusão encerra a sequência
    }
    // dia de folga vazio: apenas pula, sem quebrar
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
