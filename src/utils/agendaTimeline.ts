/**
 * Cálculos da timeline da Agenda: converter horário em posição e resolver
 * sobreposições. Fica fora do componente porque é a parte com regra de
 * verdade — e a única testável sem navegador.
 */

/** 'HH:MM' -> minutos desde a meia-noite. `null` quando não dá para ler. */
export function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * 'HH:MM' + 1 hora, para sugerir o fim ao criar um evento.
 *
 * Satura em 23:59 em vez de virar para o dia seguinte: o evento tem uma única
 * data, então 23:30 + 1h não pode virar 00:30 — isso geraria um fim ANTES do
 * início e o formulário recusaria o salvamento. Entrada ilegível devolve o
 * padrão de sempre.
 */
export function plusOneHour(time: string): string {
  const start = toMinutes(time);
  if (start === null) return '10:00';
  const end = Math.min(start + 60, 23 * 60 + 59);
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

/** Domingo da semana que contém `date`, à meia-noite local. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export interface Span {
  start: number;
  end: number;
}

export interface PackedSpan extends Span {
  /** Coluna ocupada dentro do grupo de sobreposição. */
  col: number;
  /** Quantas colunas o grupo tem — define a largura de cada bloco. */
  cols: number;
}

/**
 * Distribui intervalos que se sobrepõem em colunas lado a lado.
 *
 * Sem isso, dois compromissos no mesmo horário se empilham e o de baixo fica
 * invisível — justo o caso em que a pessoa mais precisa enxergar o conflito.
 * É o algoritmo guloso clássico: varre em ordem de início e põe cada intervalo
 * na primeira coluna já livre. Quando nenhuma coluna segue ocupada, o grupo
 * terminou e todos os seus membros recebem a mesma largura; assim dois eventos
 * que não se cruzam não ficam espremidos por causa de um terceiro distante.
 *
 * A ordem da entrada é preservada apenas dentro do critério de início; o
 * chamador não deve depender dela.
 */
export function packOverlaps<T extends Span>(items: T[]): (T & PackedSpan)[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: (T & PackedSpan)[] = [];

  let group: (T & PackedSpan)[] = [];
  let columnEnds: number[] = [];

  const closeGroup = () => {
    const cols = columnEnds.length;
    group.forEach(g => {
      g.cols = cols;
      out.push(g);
    });
    group = [];
    columnEnds = [];
  };

  sorted.forEach(item => {
    // Toda coluna já livre neste instante => o grupo anterior se fechou aqui.
    if (columnEnds.length > 0 && columnEnds.every(end => end <= item.start)) closeGroup();

    let col = columnEnds.findIndex(end => end <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }

    group.push({ ...item, col, cols: 1 });
  });

  if (group.length > 0) closeGroup();
  return out;
}
