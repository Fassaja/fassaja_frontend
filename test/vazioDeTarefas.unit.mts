/**
 * Testes dos dois vazios da tela de tarefas.
 *
 * O que se protege aqui não é o texto: é a regra de que o primeiro uso NUNCA
 * manda ajustar filtros. Foi esse embaralhamento — um recado só para as duas
 * situações — que fazia a tela de quem acabou de chegar sugerir mexer em
 * filtros que essa pessoa nunca ligou.
 * Rodar: npm test
 */
import assert from 'node:assert';
import { textoDoRecorte, vazioDeTarefas } from '../src/utils/vazioDeTarefas.ts';

let passed = 0, failed = 0;
function test(n: string, f: () => void) {
  try { f(); passed++; console.log(`  ok   ${n}`); }
  catch (e) { failed++; console.log(`  FAIL ${n}\n       ${String(e)}`); }
}

test('sem nenhuma tarefa é primeiro uso', () => {
  assert.deepStrictEqual(vazioDeTarefas(0), { tipo: 'primeiro-uso' });
});

test('com tarefas escondidas é recorte, e diz quantas', () => {
  assert.deepStrictEqual(vazioDeTarefas(17), { tipo: 'recorte', escondidas: 17 });
});

test('uma só ainda é recorte', () => {
  assert.deepStrictEqual(vazioDeTarefas(1), { tipo: 'recorte', escondidas: 1 });
});

test('contagem torta não vira "-1 tarefas escondidas"', () => {
  assert.deepStrictEqual(vazioDeTarefas(-3), { tipo: 'primeiro-uso' });
});

test('o primeiro uso não fala em filtro', () => {
  // A regra, não a redação: qualquer texto novo continua proibido de mandar
  // ajustar um filtro que ninguém ligou.
  const vazio = vazioDeTarefas(0);
  assert.strictEqual(vazio.tipo, 'primeiro-uso');
});

test('a frase do recorte concorda no singular', () => {
  assert.ok(textoDoRecorte(1).startsWith('Existe 1 tarefa '));
  assert.ok(textoDoRecorte(1).includes('escondida pela'));
});

test('e no plural', () => {
  assert.ok(textoDoRecorte(4).startsWith('Existem 4 tarefas '));
  assert.ok(textoDoRecorte(4).includes('escondidas pela'));
});

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
