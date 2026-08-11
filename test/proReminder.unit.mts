/**
 * Testes do lembrete da pesquisa do Pro (sem navegador).
 *
 * O que está em jogo: o lembrete precisa voltar a cada 7 dias para quem não
 * respondeu, e NUNCA mais para quem respondeu. Errar para o lado do excesso
 * transforma o sino em spam do próprio produto. Rodar: npm run test
 */
import {
  MIN_DAYS_TO_ASK,
  MIN_TASKS_TO_ASK,
  REMINDER_INTERVAL_MS,
  hasRespondedLocally,
  hasUsedEnoughToAsk,
  markRespondedLocally,
  reminderWindowIndex,
} from '../src/utils/proReminder.ts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

// localStorage falso para rodar fora do navegador.
let store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    store = {};
  },
  key: () => null,
  length: 0,
} as unknown as Storage;

const DIA = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-08-11T12:00:00Z').getTime();

console.log('\nLembrete da pesquisa do Pro');

// --- Janelas de 7 dias -----------------------------------------------------
store = {};
check('primeiro uso começa na janela 0', reminderWindowIndex(T0) === 0);
check('mesmo dia continua na janela 0', reminderWindowIndex(T0 + 3 * 60 * 60 * 1000) === 0);
check('6 dias depois ainda é a janela 0 (não repete antes da hora)',
  reminderWindowIndex(T0 + 6 * DIA) === 0);
check('7 dias depois vira a janela 1 (o lembrete volta)',
  reminderWindowIndex(T0 + 7 * DIA) === 1);
check('13 dias depois ainda é a janela 1', reminderWindowIndex(T0 + 13 * DIA) === 1);
check('14 dias depois vira a janela 2', reminderWindowIndex(T0 + 14 * DIA) === 2);
check('30 dias depois é a janela 4', reminderWindowIndex(T0 + 30 * DIA) === 4);

// A âncora é gravada no primeiro cálculo e não pode andar depois: se cada
// chamada regravasse "agora", o índice ficaria preso em 0 e o lembrete nunca
// voltaria — o bug mais provável desta regra.
check('a âncora do primeiro uso é persistida', !!store['fassaja_pro_lembrete_desde']);
const ancora = store['fassaja_pro_lembrete_desde'];
reminderWindowIndex(T0 + 20 * DIA);
check('a âncora NÃO é reescrita em chamadas seguintes',
  store['fassaja_pro_lembrete_desde'] === ancora);

// --- O ID muda de janela para janela --------------------------------------
// É isso que faz o item reaparecer não-lido: "lido" é guardado por ID.
const idSemana1 = `pro-${reminderWindowIndex(T0 + 2 * DIA)}`;
const idSemana2 = `pro-${reminderWindowIndex(T0 + 9 * DIA)}`;
check('o ID da notificação muda a cada janela', idSemana1 !== idSemana2);
check('o ID é estável dentro da mesma janela',
  `pro-${reminderWindowIndex(T0 + 2 * DIA)}` === `pro-${reminderWindowIndex(T0 + 5 * DIA)}`);

// --- Quem respondeu sai da lista para sempre ------------------------------
store = {};
check('quem nunca respondeu não está marcado', hasRespondedLocally() === false);
markRespondedLocally();
check('depois de responder, fica marcado', hasRespondedLocally() === true);
check('a marca sobrevive à virada de janela (não é por período)',
  hasRespondedLocally() === true && reminderWindowIndex(T0 + 400 * DIA) >= 0);

// --- Só pergunta a quem já usou o suficiente ------------------------------
// Opinião de preço de quem abriu o app agora contamina a própria medição.
store = {};
check('recém-chegado sem tarefa nenhuma NÃO é perguntado',
  hasUsedEnoughToAsk(0, T0) === false);
check('poucas tarefas no primeiro dia ainda não bastam',
  hasUsedEnoughToAsk(MIN_TASKS_TO_ASK - 1, T0) === false);
check('atingir o número de tarefas libera no mesmo dia',
  hasUsedEnoughToAsk(MIN_TASKS_TO_ASK, T0) === true);

store = {};
hasUsedEnoughToAsk(0, T0); // registra o primeiro acesso
check('tempo de casa insuficiente ainda barra',
  hasUsedEnoughToAsk(0, T0 + (MIN_DAYS_TO_ASK - 1) * DIA) === false);
check('tempo de casa suficiente libera mesmo sem tarefas',
  hasUsedEnoughToAsk(0, T0 + MIN_DAYS_TO_ASK * DIA) === true);

// Se o relógio só começasse a contar na hora de mostrar o lembrete, ele nunca
// chegaria a aparecer para quem cria poucas tarefas.
store = {};
hasUsedEnoughToAsk(0, T0);
check('a espera começa a contar já na primeira checagem',
  store['fassaja_pro_lembrete_desde'] === String(T0));

// --- Sem localStorage (navegação privada) não pode quebrar ----------------
const real = globalThis.localStorage;
globalThis.localStorage = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
} as unknown as Storage;
let quebrou = false;
try {
  reminderWindowIndex(T0);
  hasRespondedLocally();
  markRespondedLocally();
  hasUsedEnoughToAsk(0, T0);
} catch {
  quebrou = true;
}
check('localStorage bloqueado não derruba o sino', !quebrou);
globalThis.localStorage = real;

check('o intervalo é mesmo de 7 dias', REMINDER_INTERVAL_MS === 7 * DIA);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
