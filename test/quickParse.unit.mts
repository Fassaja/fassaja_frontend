/**
 * Testes do interpretador de linguagem natural do título.
 *
 * Aqui mora a regra de que só se consome o que dá para guardar: prazo é um
 * DIA, então "amanhã 15h" tira o "amanhã" e DEIXA o "15h" no título. Estes
 * testes existem para essa decisão não ser desfeita sem querer.
 * Rodar: npm test
 */
import assert from 'node:assert/strict';
import { interpretar } from '../src/utils/quickParse.ts';

let passed = 0, failed = 0;
function test(n: string, f: () => void) {
  try { f(); passed++; console.log(`  ok   ${n}`); }
  catch (e) { failed++; console.log(`  FAIL ${n}\n       ${String(e)}`); }
}

// Quarta-feira. Escolhido de propósito no meio da semana: assim "sexta" olha
// para frente e "segunda" atravessa o fim de semana. Data FIXA para a virada
// da meia-noite nunca quebrar o teste.
const QUARTA = new Date(2026, 7, 19);

test('linha sem marcador nenhum vira só título', () => {
  const r = interpretar('comprar pão', QUARTA);
  assert.equal(r.title, 'comprar pão');
  assert.equal(r.dueDate, undefined);
  assert.equal(r.priority, undefined);
  assert.deepEqual(r.tags, []);
});

test('o exemplo completo', () => {
  const r = interpretar('amanhã ligar pro cliente !alta #trabalho', QUARTA);
  assert.equal(r.title, 'ligar pro cliente');
  assert.equal(r.dueDate, '2026-08-20');
  assert.equal(r.priority, 'high');
  assert.deepEqual(r.tags, ['trabalho']);
});

test('hora fica no título, porque prazo não guarda hora', () => {
  const r = interpretar('amanhã 15h ligar pro cliente', QUARTA);
  assert.equal(r.title, '15h ligar pro cliente');
  assert.equal(r.dueDate, '2026-08-20');
});

test('"depois de amanhã" não é confundido com "amanhã"', () => {
  const r = interpretar('depois de amanhã revisar contrato', QUARTA);
  assert.equal(r.dueDate, '2026-08-21');
  assert.equal(r.title, 'revisar contrato');
});

test('dia da semana olha sempre para frente', () => {
  assert.equal(interpretar('sexta reunião', QUARTA).dueDate, '2026-08-21');
  assert.equal(interpretar('segunda reunião', QUARTA).dueDate, '2026-08-24');
});

test('o mesmo dia da semana de hoje significa a semana que vem', () => {
  // Dizer "quarta" numa quarta não quer dizer "agora": quer dizer a próxima.
  assert.equal(interpretar('quarta reunião', QUARTA).dueDate, '2026-08-26');
});

test('acento é opcional', () => {
  assert.equal(interpretar('terça x', QUARTA).dueDate, interpretar('terca x', QUARTA).dueDate);
  assert.equal(interpretar('amanha x', QUARTA).dueDate, '2026-08-20');
});

test('título preserva o acento mesmo quando a data foi casada sem ele', () => {
  const r = interpretar('terça reunião com josé', QUARTA);
  assert.equal(r.title, 'reunião com josé');
});

test('data numérica dia/mês', () => {
  assert.equal(interpretar('15/09 pagar conta', QUARTA).dueDate, '2026-09-15');
  assert.equal(interpretar('01/03/2027 x', QUARTA).dueDate, '2027-03-01');
});

test('data numérica sem ano que já passou pula para o ano que vem', () => {
  assert.equal(interpretar('10/01 IPVA', QUARTA).dueDate, '2027-01-10');
});

test('data impossível não é "corrigida" em silêncio', () => {
  // 31/02 viraria 03/03 num Date ingênuo. Preferimos não achar data nenhuma.
  const r = interpretar('31/02 x', QUARTA);
  assert.equal(r.dueDate, undefined);
  assert.equal(r.title, '31/02 x');
});

test('"dia 15" pega o próximo dia 15', () => {
  assert.equal(interpretar('dia 25 dentista', QUARTA).dueDate, '2026-08-25');
  assert.equal(interpretar('dia 5 dentista', QUARTA).dueDate, '2026-09-05');
});

test('em N dias / semanas', () => {
  assert.equal(interpretar('em 3 dias x', QUARTA).dueDate, '2026-08-22');
  assert.equal(interpretar('daqui a 2 semanas x', QUARTA).dueDate, '2026-09-02');
});

test('várias tags, sem repetir', () => {
  const r = interpretar('#casa comprar #casa #mercado leite', QUARTA);
  assert.deepEqual(r.tags, ['casa', 'mercado']);
  assert.equal(r.title, 'comprar leite');
});

test('sinônimos de prioridade', () => {
  assert.equal(interpretar('x !urgente', QUARTA).priority, 'high');
  assert.equal(interpretar('x !média', QUARTA).priority, 'medium');
  assert.equal(interpretar('x !baixa', QUARTA).priority, 'low');
});

test('palavra desconhecida depois do ! continua no título', () => {
  const r = interpretar('x !urgentíssimo', QUARTA);
  assert.equal(r.priority, undefined);
  assert.equal(r.title, 'x !urgentíssimo');
});

test('duas prioridades: vale a primeira, a segunda não vira lixo no título', () => {
  const r = interpretar('x !alta !baixa', QUARTA);
  assert.equal(r.priority, 'high');
  assert.equal(r.title, 'x !baixa');
});

test('# no meio da palavra não é tag', () => {
  const r = interpretar('resolver bug#42', QUARTA);
  assert.deepEqual(r.tags, []);
  assert.equal(r.title, 'resolver bug#42');
});

test('só marcadores: título vazio (a tela decide o que fazer)', () => {
  assert.equal(interpretar('amanhã !alta #x', QUARTA).title, '');
});

test('espaços sobrando somem', () => {
  assert.equal(interpretar('  ligar   amanhã   pro   cliente ', QUARTA).title, 'ligar pro cliente');
});

test('só a primeira data conta', () => {
  // "amanhã e depois sexta" — a segunda menção fica no título, visível.
  const r = interpretar('amanhã falar e sexta cobrar', QUARTA);
  assert.equal(r.dueDate, '2026-08-20');
  assert.equal(r.title, 'falar e sexta cobrar');
});

test('com lista de tags conhecidas, a desconhecida fica no título', () => {
  const r = interpretar('comprar #mercado #inexistente', QUARTA, {
    tagsConhecidas: ['Mercado', 'Casa'],
  });
  assert.deepEqual(r.tags, ['Mercado']); // nome exato da lista, não o digitado
  assert.equal(r.title, 'comprar #inexistente');
});

test('tag conhecida casa sem depender de acento ou maiúscula', () => {
  const r = interpretar('x #Reuniao', QUARTA, { tagsConhecidas: ['reunião'] });
  assert.deepEqual(r.tags, ['reunião']);
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
