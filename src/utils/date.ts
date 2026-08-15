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

/**
 * Converte um Date para 'YYYY-MM-DD' usando os componentes LOCAIS (não UTC).
 * `toISOString()` converteria para UTC e jogaria o dia para frente/trás em
 * fusos diferentes de Greenwich — daí este helper para datas "só-dia".
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hoje no fuso local, como 'YYYY-MM-DD'. */
export function todayISO(): string {
  return toISODate(new Date());
}

const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * Rótulo curto para um CHIP de data — o controle compacto dos modais de
 * criação, onde `formatDate` não cabe.
 *
 * Duas diferenças, ambas por causa do espaço: o pt-BR do `toLocaleDateString`
 * devolve "15 de ago. de 2026", que num chip ao lado da prioridade e do
 * projeto quebra a linha sozinho; e o dia mais provável de ser escolhido tem
 * nome — quem marca uma tarefa para hoje quer ler "Hoje", não a data de hoje.
 *
 * `hoje` é injetável para o teste não depender do relógio.
 */
export function formatDateChip(dateString: string, hoje: Date = new Date()): string {
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime())) return '';

  // Normaliza os dois lados para meia-noite local: comparar instantes faria
  // "hoje às 23h" e "hoje às 01h" caírem em dias diferentes.
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const alvo = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Math.round e não trunc: uma virada de horário de verão entre as duas datas
  // deixa a divisão em 0,96 dia, e o truncamento diria "Hoje" para amanhã.
  const dias = Math.round((alvo.getTime() - base.getTime()) / 86400000);

  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  if (dias === -1) return 'Ontem';

  const curto = `${alvo.getDate()} ${MESES_ABREV[alvo.getMonth()]}`;
  // O ano só aparece quando não é o corrente — fora isso ele é ruído.
  return alvo.getFullYear() === base.getFullYear() ? curto : `${curto} ${alvo.getFullYear()}`;
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
