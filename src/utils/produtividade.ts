/**
 * As séries e os números da semana, sempre a partir do HISTÓRICO do servidor.
 *
 * Nada aqui olha a lista de tarefas, e é esse o ponto. O servidor apaga
 * tarefas concluídas depois de 4 dias, então contar as que ainda existem faz
 * o passado desaparecer: o gráfico do mês mostrava as três primeiras semanas
 * zeradas, e a barra da meta semanal ANDAVA PARA TRÁS na sexta, apagando o que
 * a pessoa tinha feito na segunda. O `DailyStat` guarda a contagem de cada dia
 * numa linha que não some — é dele que estes números saem.
 *
 * A semana começa na SEGUNDA, como no resto do app e como se lê um calendário
 * em português. Havia um lugar contando a partir de domingo, e "esta semana"
 * significava duas coisas diferentes na mesma tela.
 */

export interface DiaDoHistorico {
  date: string; // 'YYYY-MM-DD'
  created: number;
  completed: number;
}

export interface PontoDaSerie {
  day: string;
  created: number;
  completed: number;
}

export const ROTULOS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** 'AAAA-MM-DD' pelos componentes LOCAIS (o dia do usuário, não o de Greenwich). */
export function diaISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** Segunda-feira da semana de `hoje`, à meia-noite local. */
export function inicioDaSemana(hoje: Date): Date {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  // getDay(): 0 = domingo. `(dia + 6) % 7` transforma em 0 = segunda.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function doDia(porDia: Map<string, DiaDoHistorico>, d: Date): DiaDoHistorico {
  return porDia.get(diaISO(d)) ?? { date: diaISO(d), created: 0, completed: 0 };
}

/** Um ponto por dia, de segunda a domingo da semana corrente. */
export function serieDaSemana(
  porDia: Map<string, DiaDoHistorico>,
  hoje: Date,
): PontoDaSerie[] {
  const segunda = inicioDaSemana(hoje);
  return ROTULOS_DA_SEMANA.map((label, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    const n = doDia(porDia, d);
    return { day: label, created: n.created, completed: n.completed };
  });
}

/**
 * Um ponto por semana do mês corrente.
 *
 * Os baldes são blocos de 7 dias contados do dia 1 — não semanas de calendário.
 * É o que faz "Sem 1" significar sempre os dias 1 a 7, independentemente do dia
 * da semana em que o mês começou; semanas de calendário deixariam a primeira
 * barra com um ou dois dias e a comparação entre elas perderia o sentido.
 */
export function serieDoMes(
  porDia: Map<string, DiaDoHistorico>,
  hoje: Date,
): PontoDaSerie[] {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const baldes: PontoDaSerie[] = Array.from(
    { length: Math.ceil(diasNoMes / 7) },
    (_, i) => ({ day: `Sem ${i + 1}`, created: 0, completed: 0 }),
  );
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const n = doDia(porDia, new Date(ano, mes, dia));
    const balde = baldes[Math.floor((dia - 1) / 7)];
    balde.created += n.created;
    balde.completed += n.completed;
  }
  return baldes;
}

export interface ResumoSemanal {
  /** Concluídas de segunda até hoje. */
  estaSemana: number;
  /** Concluídas na semana anterior, inteira. */
  semanaPassada: number;
  /** Variação percentual. 0 quando não há base de comparação. */
  variacao: number;
}

/**
 * Quanto foi concluído nesta semana e na anterior.
 *
 * Sem base de comparação a variação é 0, e não 100%: uma pessoa na primeira
 * semana de uso não "melhorou 100%", ela simplesmente não tem com o que
 * comparar. Era o que acontecia antes — como as concluídas da semana passada
 * já tinham sido apagadas, a conta caía sempre no caso "sem base" e o app
 * exibia "+100%" toda semana, para todo mundo.
 */
export function resumoSemanal(
  porDia: Map<string, DiaDoHistorico>,
  hoje: Date,
): ResumoSemanal {
  const segunda = inicioDaSemana(hoje);

  const somar = (de: Date, ate: Date): number => {
    let soma = 0;
    const cursor = new Date(de);
    while (cursor <= ate) {
      soma += doDia(porDia, cursor).completed;
      cursor.setDate(cursor.getDate() + 1);
    }
    return soma;
  };

  const anterior = new Date(segunda);
  anterior.setDate(segunda.getDate() - 7);
  const fimAnterior = new Date(segunda);
  fimAnterior.setDate(segunda.getDate() - 1);

  const estaSemana = somar(segunda, hoje);
  const semanaPassada = somar(anterior, fimAnterior);

  return {
    estaSemana,
    semanaPassada,
    variacao:
      semanaPassada === 0
        ? 0
        : Math.round(((estaSemana - semanaPassada) / semanaPassada) * 100),
  };
}
