/**
 * Lembrete da pesquisa do Pro: quem já respondeu e de quanto em quanto tempo o
 * sino volta a perguntar.
 *
 * Vive em utils/ (e não no proService) porque não depende da API — o que
 * permite testar a regra dos 7 dias sem navegador nem servidor, em
 * test/proReminder.unit.mts.
 */

const RESPONDED_KEY = 'fassaja_pro_respondido';
const SINCE_KEY = 'fassaja_pro_lembrete_desde';

/** Intervalo entre um lembrete e o seguinte. */
export const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Marca localmente que esta pessoa respondeu.
 *
 * O servidor é a fonte de verdade para quem tem conta, mas o visitante não tem
 * como ser consultado — e é justamente ele quem mais recebe o lembrete. Sem
 * esta marca, quem respondeu sem conta continuaria sendo cutucado para sempre.
 */
export function markRespondedLocally(): void {
  try {
    localStorage.setItem(RESPONDED_KEY, '1');
  } catch {
    // localStorage indisponível (navegação privada): o lembrete volta na
    // próxima janela. Chato, mas inofensivo.
  }
}

export function hasRespondedLocally(): boolean {
  try {
    return localStorage.getItem(RESPONDED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Índice da janela de 7 dias atual, contada a partir do primeiro uso.
 *
 * É esse número que faz o lembrete voltar: ele entra no ID da notificação, e
 * "lido" é guardado por ID. Dispensar marca a janela ATUAL como lida; sete dias
 * depois o índice muda, o ID é outro e o item reaparece não-lido — sem estado
 * novo além do que o sino já mantém.
 *
 * A âncora é o primeiro uso, não o início do calendário: com janelas fixas,
 * quem chegasse na véspera da virada levaria o segundo lembrete no dia
 * seguinte, e o "a cada 7 dias" viraria mentira para metade das pessoas.
 */
export function reminderWindowIndex(now: number = Date.now()): number {
  return Math.floor((now - firstUseAt(now)) / REMINDER_INTERVAL_MS);
}

/**
 * Instante do primeiro uso neste dispositivo, gravado na primeira consulta.
 *
 * Precisa ser registrado mesmo quando o lembrete ainda não vai aparecer: é
 * daqui que sai o tempo de casa que libera a pergunta. Se só fosse gravado na
 * hora de mostrar, o relógio nunca começaria a contar.
 */
function firstUseAt(now: number): number {
  try {
    const stored = Number(localStorage.getItem(SINCE_KEY)) || 0;
    if (stored) return stored;
    localStorage.setItem(SINCE_KEY, String(now));
    return now;
  } catch {
    // Sem localStorage não há âncora persistente: trata "agora" como início,
    // o que mantém o índice em 0 e mostra o lembrete uma vez por sessão.
    return now;
  }
}

/** Tarefas criadas que já bastam para a pessoa ter uma opinião formada. */
export const MIN_TASKS_TO_ASK = 5;
/** Ou, na falta delas, tempo de casa suficiente. */
export const MIN_DAYS_TO_ASK = 3;

/**
 * A pessoa já usou o Fassaja o bastante para opinar sobre preço?
 *
 * Perguntar quanto vale um produto para quem abriu o app há dois minutos
 * produz resposta ruim — e resposta ruim contamina exatamente a medição que
 * vai definir o preço. Melhor perder o respondente do que registrar um chute.
 *
 * É OU, não E: quem criou cinco tarefas no primeiro dia já formou opinião, e
 * quem voltou por três dias também — mesmo tendo criado pouca coisa.
 *
 * Obs.: "dias" aqui é tempo desde o primeiro acesso, não dias ativos. Contar
 * uso real exigiria um registro novo de presença; o tempo de casa é uma
 * aproximação barata e boa o suficiente para segurar o respondente cru.
 */
export function hasUsedEnoughToAsk(taskCount: number, now: number = Date.now()): boolean {
  if (taskCount >= MIN_TASKS_TO_ASK) return true;
  const dias = (now - firstUseAt(now)) / (24 * 60 * 60 * 1000);
  return dias >= MIN_DAYS_TO_ASK;
}
