import type { Task } from '@/types/task';
// Extensão explícita: import de VALOR, resolvido pelo Node no teste de unidade
// (mesma razão do teamReport.ts).
import { MESES_ABREV, todayISO, toISODate } from './date.ts';

/**
 * A projeção do cronograma da equipe — lógica pura, sem React, testável em Node.
 *
 * Roda no CLIENTE, como o relatório de carga: a lista de tarefas da equipe já
 * está na mão (`useTeamDetail`), "hoje" é o dia LOCAL de quem olha, e
 * "bloqueada" depende de a mãe ter fechado para a equipe — tudo coisa que o
 * servidor não sabe melhor do que a tela. Ver docs/cronograma-da-equipe.md
 * no backend.
 */

export interface ScheduleRow {
  /** Já passada por deriveTaskStatus — "atrasada" vem pronta. */
  task: Task;
  /** 'AAAA-MM-DD'. Sem início = o próprio prazo (vira marco). */
  start: string;
  /** Sem prazo = hoje (barra com a ponta aberta). */
  end: string;
  /** Coluna inicial e final (inclusiva), já dentro da janela. */
  col: { start: number; end: number };
  /** Sem início: um losango no dia do prazo, não uma barra. */
  marco: boolean;
  /** Sem prazo: a barra vai até hoje e não fecha. */
  abertoNoFim: boolean;
  /** A janela tem teto; o que passa dele entra na última coluna, cortado. */
  cortada: boolean;
  /** A tarefa que segura esta, se ainda não fechou para a equipe. */
  bloqueadaPor: Task | null;
}

export interface ScheduleGroup {
  /** null = "Sem projeto", sempre por último. */
  project: { id: string; name: string; color: string } | null;
  rows: ScheduleRow[];
}

export interface ScheduleWeek {
  /** "8 – 14 set", ou "29 set – 5 out" quando cruza o mês. */
  label: string;
  /** Quantas colunas esta semana ocupa dentro da janela. */
  span: number;
}

export interface TeamSchedule {
  groups: ScheduleGroup[];
  /** Cada coluna, 'AAAA-MM-DD'. */
  days: string[];
  weeks: ScheduleWeek[];
  today: string;
  /** Índice de hoje em `days`; -1 quando hoje está fora da janela (não acontece com a folga). */
  todayCol: number;
  /** Tarefas da equipe que ficaram de fora por não ter data nenhuma. */
  semData: number;
}

/** Folga antes de hoje e depois do último prazo: a barra da semana passada e o que vem aí. */
const FOLGA_ANTES = 7;
const FOLGA_DEPOIS = 21;
/**
 * Teto de colunas. Um plano de quatro meses ainda cabe numa rolagem; além
 * disso a tela vira um tapete e a resposta certa é um zoom, que esta fatia
 * não tem de propósito.
 */
export const MAX_DIAS = 120;

const SEM_COR = '#94A3B8';

/** 'AAAA-MM-DD' local, deslocado em dias. */
export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + dias));
}

/**
 * Dias de `a` até `b`, em dias de calendário local.
 *
 * Math.round, não trunc: a virada do horário de verão deixa a diferença em
 * 0,96 dia, e o truncamento faria o prazo de amanhã cair na coluna de hoje.
 */
export function diferencaDias(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
}

/** Domingo ou sábado? Coluna que a tela pinta diferente. */
export function fimDeSemana(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  return dia === 0 || dia === 6;
}

/** Semanas de segunda a domingo cobrindo `days`, com a primeira e a última cortadas na janela. */
export function semanasDe(days: string[]): ScheduleWeek[] {
  const semanas: ScheduleWeek[] = [];
  let inicio = 0;
  for (let i = 0; i <= days.length; i++) {
    const [y, m, d] = (days[i] ?? '').split('-').map(Number);
    const segunda = i < days.length && new Date(y, m - 1, d).getDay() === 1;
    if ((segunda && i > inicio) || i === days.length) {
      if (i > inicio) semanas.push({ label: rotuloDoIntervalo(days[inicio], days[i - 1]), span: i - inicio });
      inicio = i;
    }
  }
  return semanas;
}

/** "8 – 12 set", "29 set – 5 out", ou só "11 set" quando é um dia. */
export function rotuloDoIntervalo(de: string, ate: string): string {
  const [, dm, dd] = de.split('-').map(Number);
  const [, am, ad] = ate.split('-').map(Number);
  if (de === ate) return `${dd} ${MESES_ABREV[dm - 1]}`;
  if (dm === am) return `${dd} – ${ad} ${MESES_ABREV[dm - 1]}`;
  return `${dd} ${MESES_ABREV[dm - 1]} – ${ad} ${MESES_ABREV[am - 1]}`;
}

/** Fechou PARA A EQUIPE — ou, sem responsáveis, fechou. */
function fechada(t: Task): boolean {
  return t.teamCompleted ?? t.status === 'completed';
}

export function buildTeamSchedule(
  tasks: Task[],
  projects: { id: string; name: string; color: string }[],
  today: string = todayISO(),
): TeamSchedule {
  const porId = new Map(tasks.map(t => [t.id, t]));
  const comData = tasks.filter(t => t.startDate || t.dueDate);

  // A janela: do menor início ao maior fim, com folga dos dois lados — e hoje
  // sempre dentro, senão a linha de "hoje" não teria onde ficar.
  let from = somarDias(today, -FOLGA_ANTES);
  let to = somarDias(today, FOLGA_DEPOIS);
  for (const t of comData) {
    const inicio = t.startDate || t.dueDate!;
    const fim = t.dueDate || (inicio > today ? inicio : today);
    if (inicio < from) from = inicio;
    if (fim > to) to = fim;
  }
  if (diferencaDias(from, to) + 1 > MAX_DIAS) to = somarDias(from, MAX_DIAS - 1);

  const days: string[] = [];
  for (let d = from; d <= to; d = somarDias(d, 1)) days.push(d);
  const ultima = days.length - 1;

  const linhas = comData.map((task): ScheduleRow => {
    const start = task.startDate || task.dueDate!;
    const abertoNoFim = !task.dueDate;
    const end = task.dueDate || (start > today ? start : today);
    const mae = task.dependsOnId ? porId.get(task.dependsOnId) : undefined;
    const cs = diferencaDias(from, start);
    const ce = diferencaDias(from, end);
    return {
      task,
      start,
      end,
      col: { start: Math.min(cs, ultima), end: Math.min(ce, ultima) },
      marco: !task.startDate,
      abertoNoFim,
      cortada: ce > ultima,
      bloqueadaPor: mae && !fechada(mae) ? mae : null,
    };
  });

  const ordenar = (a: ScheduleRow, b: ScheduleRow) =>
    a.start.localeCompare(b.start) ||
    a.end.localeCompare(b.end) ||
    a.task.title.localeCompare(b.task.title);

  // Grupos na ordem dos projetos (a mesma do Painel); "Sem projeto" por último.
  // Grupo sem tarefa datada não aparece — uma seção vazia é só ruído.
  const groups: ScheduleGroup[] = [];
  for (const p of projects) {
    const rows = linhas.filter(r => r.task.projectId === p.id).sort(ordenar);
    if (rows.length) groups.push({ project: { id: p.id, name: p.name, color: p.color }, rows });
  }
  const conhecidos = new Set(projects.map(p => p.id));
  const soltas = linhas.filter(r => !r.task.projectId || !conhecidos.has(r.task.projectId)).sort(ordenar);
  if (soltas.length) groups.push({ project: null, rows: soltas });

  return {
    groups,
    days,
    weeks: semanasDe(days),
    today,
    todayCol: days.indexOf(today),
    semData: tasks.length - comData.length,
  };
}

/**
 * As datas de uma linha, escritas — para onde a barra não cabe (o celular).
 * Marco é só o dia; barra aberta diz desde quando.
 */
export function rotuloDaLinha(row: Pick<ScheduleRow, 'start' | 'end' | 'marco' | 'abertoNoFim'>): string {
  if (row.marco) return rotuloDoIntervalo(row.start, row.start);
  if (row.abertoNoFim) return `desde ${rotuloDoIntervalo(row.start, row.start)}`;
  return rotuloDoIntervalo(row.start, row.end);
}

/** As colunas onde começa uma semana inteira (segundas). A semana cortada do início fica de fora. */
export function segundasDe(weeks: ScheduleWeek[]): number[] {
  const inicios: number[] = [];
  let col = 0;
  for (const w of weeks) {
    inicios.push(col);
    col += w.span;
  }
  // A primeira coluna só é segunda se a semana for inteira; sem isso o
  // rótulo "4 set" de uma sexta colidia com o "7 set" da segunda seguinte.
  return weeks[0]?.span === 7 ? inicios : inicios.slice(1);
}

/**
 * Rótulos do cabeçalho compacto: as segundas, pulando semanas até caberem
 * no máximo `max` numa trilha estreita.
 */
export function marcasDe(days: string[], weeks: ScheduleWeek[], max = 5): { col: number; label: string }[] {
  const segundas = segundasDe(weeks);
  const passo = Math.max(1, Math.ceil(segundas.length / max));
  return segundas
    .filter((_, i) => i % passo === 0)
    .map(c => ({ col: c, label: rotuloDoIntervalo(days[c], days[c]) }));
}

/** A cor da barra: a do projeto, ou o cinza das soltas. */
export function corDoGrupo(group: ScheduleGroup): string {
  return group.project?.color ?? SEM_COR;
}
