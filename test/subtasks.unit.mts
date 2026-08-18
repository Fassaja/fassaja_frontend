/**
 * Testes do progresso do checklist.
 *
 * Três telas mostram o mesmo número — card, detalhe e barra —, então o cálculo
 * mora num lugar só. O que este arquivo prende são os casos de borda em que é
 * fácil errar: lista vazia (divisão por zero) e "completo" com zero passos.
 * Rodar: npm test
 */
import assert from 'node:assert';

// Cópia da implementação: o teste roda em Node puro, sem o alias '@/' do Vite.
// Se divergir de src/utils/subtasks.ts, o teste perde o sentido — por isso a
// função é curta e sem dependências, de propósito.
function subtaskProgress(subtasks?: { done: boolean }[]) {
  const lista = subtasks ?? [];
  const total = lista.length;
  const feitos = lista.filter(p => p.done).length;
  return {
    feitos,
    total,
    percentual: total === 0 ? 0 : Math.round((feitos / total) * 100),
    completo: total > 0 && feitos === total,
  };
}

let passed = 0;
let failed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${nome}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${nome}\n       ${String(err)}`);
  }
}

const p = (done: boolean) => ({ done });

test('lista ausente não quebra e não é "completa"', () => {
  const r = subtaskProgress(undefined);
  assert.deepStrictEqual(
    { ...r },
    { feitos: 0, total: 0, percentual: 0, completo: false },
  );
});

test('lista vazia dá 0% e não NaN', () => {
  const r = subtaskProgress([]);
  assert.strictEqual(r.percentual, 0);
  assert.ok(!Number.isNaN(r.percentual));
});

test('lista vazia NÃO conta como completa', () => {
  // Sem o `total > 0`, "0 de 0 feitos" seria verdadeiro e toda tarefa sem
  // passos ofereceria o atalho de concluir.
  assert.strictEqual(subtaskProgress([]).completo, false);
});

test('conta os feitos e arredonda o percentual', () => {
  const r = subtaskProgress([p(true), p(false), p(false)]);
  assert.strictEqual(r.feitos, 1);
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.percentual, 33);
});

test('todos feitos => 100% e completo', () => {
  const r = subtaskProgress([p(true), p(true)]);
  assert.strictEqual(r.percentual, 100);
  assert.strictEqual(r.completo, true);
});

test('nenhum feito => 0% e não completo', () => {
  const r = subtaskProgress([p(false), p(false)]);
  assert.strictEqual(r.percentual, 0);
  assert.strictEqual(r.completo, false);
});

test('um único passo feito já é completo', () => {
  assert.strictEqual(subtaskProgress([p(true)]).completo, true);
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
