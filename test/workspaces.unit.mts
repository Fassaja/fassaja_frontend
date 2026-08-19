/**
 * Testes da comparação de recortes.
 *
 * É ela que decide se a barra mostra "alterada". Um falso positivo aqui faz a
 * área parecer modificada sem ninguém ter tocado em nada — e a pessoa passa a
 * ignorar o aviso, que era justamente o ponto dele.
 * Rodar: npm test
 */
import assert from 'node:assert';

type F = {
  filterStatus: string; filterPriority: string; filterProject: string;
  filterTags: string[]; view: string; scope: string;
};
function mesmosFiltros(a: F, b: F): boolean {
  return (
    a.filterStatus === b.filterStatus &&
    a.filterPriority === b.filterPriority &&
    a.filterProject === b.filterProject &&
    a.view === b.view &&
    a.scope === b.scope &&
    a.filterTags.length === b.filterTags.length &&
    [...a.filterTags].sort().join(',') === [...b.filterTags].sort().join(',')
  );
}
const base = (): F => ({
  filterStatus: 'all', filterPriority: 'all', filterProject: 'none',
  filterTags: [], view: 'board', scope: 'solo',
});

let passed = 0, failed = 0;
function test(n: string, f: () => void) {
  try { f(); passed++; console.log(`  ok   ${n}`); }
  catch (e) { failed++; console.log(`  FAIL ${n}\n       ${String(e)}`); }
}

test('recortes idênticos são iguais', () => {
  assert.ok(mesmosFiltros(base(), base()));
});

test('tags em ordem diferente são o MESMO recorte', () => {
  // Sem ordenar, marcar A depois B pareceria diferente de B depois A.
  const a = { ...base(), filterTags: ['a', 'b'] };
  const b = { ...base(), filterTags: ['b', 'a'] };
  assert.ok(mesmosFiltros(a, b));
});

test('tag a mais é recorte diferente', () => {
  assert.ok(!mesmosFiltros({ ...base(), filterTags: ['a'] }, { ...base(), filterTags: ['a', 'b'] }));
});

test('cada campo, sozinho, muda o recorte', () => {
  for (const [campo, valor] of [
    ['filterStatus', 'pending'], ['filterPriority', 'high'],
    ['filterProject', 'p1'], ['view', 'list'], ['scope', 'team'],
  ] as const) {
    assert.ok(!mesmosFiltros(base(), { ...base(), [campo]: valor }), campo);
  }
});

test('mesma quantidade de tags mas diferentes', () => {
  assert.ok(!mesmosFiltros({ ...base(), filterTags: ['a'] }, { ...base(), filterTags: ['b'] }));
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
