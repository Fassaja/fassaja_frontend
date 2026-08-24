/**
 * O que o Bob diz na aba Foco, e qual tarefa ele sugere.
 *
 * NÃO chama a IA — e isso é escolha, não limitação. Tudo o que ele precisa
 * responder ("no que eu começo?", "já foquei bastante hoje?", "é hora de
 * pausa?") sai de dados que o app já tem na tela: prazo, prioridade, passos,
 * e as sessões do dia. Mandar isso para um modelo gastaria uma das 5 gerações
 * semanais para responder o que uma regra responde na hora — e a resposta
 * chegaria depois, o que num timer é o oposto do que se quer.
 *
 * É o mesmo princípio do interpretador de linguagem natural do título: se dá
 * para acertar com regra, regra é melhor.
 */
import type { Task } from '@/types/task';

/** Ritmo Pomodoro: pausa longa a cada quatro sessões. */
export const SESSOES_ATE_PAUSA_LONGA = 4;

/** Atalhos de duração. São sugestões — o tempo é livre dentro dos limites. */
export const DURACOES_RAPIDAS = [15, 25, 50];
/**
 * Mesmos limites do servidor (`focus.util.ts`), e a fronteira está travada no
 * e2e de lá para os dois não divergirem em silêncio.
 *
 * Uma hora de teto é escolha de produto: acima disso deixa de ser sessão de
 * foco e vira "a tarde inteira", e aí o timer não ajuda a decidir nada.
 */
export const MIN_MINUTOS = 1;
export const MAX_MINUTOS = 60;

/**
 * Prende a duração digitada nos limites que o servidor aceita.
 *
 * Feito aqui também, e não só no back: um 400 depois de a pessoa escolher o
 * tempo é resposta tardia para uma regra que dá para respeitar antes.
 */
export function limitarMinutos(valor: number): number {
  if (!Number.isFinite(valor)) return 25;
  return Math.min(MAX_MINUTOS, Math.max(MIN_MINUTOS, Math.round(valor)));
}

/** 'Xh', 'Xh YYmin' ou 'X min' — como se fala, não como se calcula. */
export function rotuloDeDuracao(minutos: number): string {
  const m = limitarMinutos(minutos);
  if (m < 60) return `${m} min`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

export interface EstadoDoFoco {
  /** Sessões de foco já concluídas hoje. */
  sessoesHoje: number;
  /** Minutos focados hoje. */
  minutosHoje: number;
  /** Há uma sessão rodando agora? */
  rodando: boolean;
  /** A tarefa escolhida, se houver. */
  tarefa?: Task | null;
}

export interface FalaDoBob {
  estado: 'happy' | 'strong' | 'confused' | 'celebrate' | 'investigate';
  titulo: string;
  texto: string;
}

/** Plural sem gambiarra de string. */
function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * A fala do Bob para o estado atual.
 *
 * A ordem dos casos é a ordem de urgência do que a pessoa precisa ouvir:
 * primeiro o que está acontecendo agora, depois o descanso, depois o começo.
 */
export function falaDoBob(e: EstadoDoFoco): FalaDoBob {
  if (e.rodando) {
    return {
      estado: 'investigate',
      titulo: e.tarefa ? e.tarefa.title : 'Sessão em andamento',
      texto: 'Estou de olho no relógio. Volte quando ele tocar.',
    };
  }

  // Pausa longa tem prioridade sobre elogio: quem já fez quatro precisa mais
  // de parar do que de ouvir que foi bem.
  if (e.sessoesHoje > 0 && e.minutosHoje > 0 && e.sessoesHoje % SESSOES_ATE_PAUSA_LONGA === 0) {
    return {
      estado: 'celebrate',
      titulo: `${plural(e.sessoesHoje, 'sessão', 'sessões')} hoje!`,
      texto: 'Ciclo completo. Levante, beba água — 15 minutos longe da tela contam a seu favor.',
    };
  }

  /*
   * Sessão contada mas SEM tempo: alguém abriu e encerrou em segundos.
   *
   * O Bob não pode aparecer forte com zero minuto no placar — o desenho
   * comemora um esforço que não houve, e a frase ao lado dele diz "0 minutos
   * focados". A postura tem de acompanhar o número, senão ela vira enfeite e
   * a pessoa para de olhar para ele.
   */
  if (e.sessoesHoje > 0 && e.minutosHoje === 0) {
    return {
      estado: 'happy',
      titulo: 'Bora começar de novo?',
      texto: 'A última sessão mal saiu do lugar. Escolha um tempo e vá até o fim desta vez.',
    };
  }

  if (e.sessoesHoje > 0) {
    return {
      // `strong` é do Bob que levantou peso — cabe a quem tem tempo no placar,
      // e só a partir daí.
      estado: 'strong',
      titulo: `${plural(e.minutosHoje, 'minuto focado', 'minutos focados')} hoje`,
      texto:
        e.sessoesHoje === 1
          ? 'Primeira sessão fechada. A segunda costuma render mais que a primeira.'
          : `Já são ${plural(e.sessoesHoje, 'sessão', 'sessões')}. Falta ${
              SESSOES_ATE_PAUSA_LONGA - (e.sessoesHoje % SESSOES_ATE_PAUSA_LONGA)
            } para a pausa longa.`,
    };
  }

  if (e.tarefa) {
    return {
      estado: 'happy',
      titulo: 'Pronto para começar',
      texto: `Vamos de "${e.tarefa.title}". Escolha o tempo e eu cuido do resto.`,
    };
  }

  return {
    estado: 'confused',
    titulo: 'No que vamos trabalhar?',
    texto: 'Escolha uma tarefa abaixo — ou comece sem escolher, se for estudar algo solto.',
  };
}

export interface Candidata {
  task: Task;
  /** Por que ela está no topo. Aparece na tela: sugestão sem motivo é palpite. */
  motivo: string;
}

/**
 * As tarefas que fazem sentido atacar agora, em ordem.
 *
 * Usa o que já existe — prazo, prioridade, status — em vez de pedir à pessoa
 * que classifique de novo o que ela já classificou. A ordem é a mesma que
 * alguém usaria no papel: o que venceu, o que vence hoje, o que já começou, o
 * que é urgente, o resto.
 */
export function candidatasParaFoco(tasks: Task[], hojeISO: string, limite = 5): Candidata[] {
  const abertas = tasks.filter(t => t.status !== 'completed');

  const pontuar = (t: Task): { peso: number; motivo: string } | null => {
    if (t.status === 'overdue' || (t.dueDate && t.dueDate < hojeISO)) {
      return { peso: 0, motivo: 'Atrasada' };
    }
    if (t.dueDate === hojeISO) return { peso: 1, motivo: 'Vence hoje' };
    if (t.status === 'in_progress') return { peso: 2, motivo: 'Já começou' };
    if (t.priority === 'high') return { peso: 3, motivo: 'Prioridade alta' };
    // Sem nenhum sinal: entra, mas por último e sem inventar um motivo.
    return { peso: 4, motivo: '' };
  };

  return abertas
    .map(task => ({ task, ...pontuar(task)! }))
    .sort(
      (a, b) =>
        a.peso - b.peso ||
        // Entre iguais, o prazo mais próximo primeiro; sem prazo vai para o fim.
        (a.task.dueDate ?? '9999').localeCompare(b.task.dueDate ?? '9999') ||
        a.task.title.localeCompare(b.task.title),
    )
    .slice(0, limite)
    .map(({ task, motivo }) => ({ task, motivo }));
}

/**
 * Duração sugerida para a tarefa, em minutos.
 *
 * Tarefa com muitos passos pede sessão longa; tarefa que vence hoje pede a
 * clássica de 25, que entrega antes. É uma sugestão de UM clique — a pessoa
 * continua escolhendo qualquer uma das três.
 */
export function duracaoSugerida(task: Task | null | undefined, hojeISO: string): number {
  if (!task) return 25;
  if ((task.subtasks?.length ?? 0) >= 4) return 50;
  if (task.dueDate === hojeISO || task.status === 'overdue') return 25;
  return task.priority === 'high' ? 50 : 25;
}
