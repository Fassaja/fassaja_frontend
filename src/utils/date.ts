/**
 * Interpreta a string de data no fuso LOCAL.
 *
 * Datas "só-dia" (YYYY-MM-DD, como as que o DatePicker gera) seriam lidas pelo
 * `new Date()` como meia-noite UTC, o que joga o dia para trás em fusos a oeste
 * de Greenwich (todo o Brasil). Aqui montamos a data com os componentes locais
 * para evitar esse off-by-one. Timestamps completos (com hora/'T'/'Z') seguem
 * sendo interpretados como instantes, preservando o comportamento atual.
 */
function parseDate(dateString: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(dateString);
}

export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function formatDateWithDay(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isToday(dateString: string): boolean {
  const date = parseDate(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isOverdue(dateString: string): boolean {
  const date = parseDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function isTomorrow(dateString: string): boolean {
  const date = parseDate(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

export function isThisWeek(dateString: string): boolean {
  const date = parseDate(dateString);
  const today = new Date();
  // Normaliza para o início do dia: senão a hora atual contamina os limites
  // da semana e datas à meia-noite (domingo) caem fora por engano.
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - today.getDay()); // domingo 00:00
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999); // sábado 23:59

  return date >= firstDay && date <= lastDay;
}

export function getDayOfWeek(dateString: string): string {
  const date = parseDate(dateString);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  return days[date.getDay()];
}
