/**
 * Testes do filtro de projeto.
 *
 * A regra vive num lugar só porque estava copiada em quatro arquivos. Estes
 * testes existem para que "sem projeto" não vire mais uma condição que alguém
 * esquece de replicar.
 * Rodar: npm test
 */
import assert from 'node:assert';

const TODOS_PROJETOS = 'all';
const SEM_PROJETO = 'none';
function combinaComProjeto(task: { projectId?: string | null }, filterProject: string): boolean {
  if (filterProject === TODOS_PROJETOS) return true;
  if (filterProject === SEM_PROJETO) return !task.projectId;
  return task.projectId === filterProject;
}

let passed = 0, failed = 0;
function test(n: string, f: () => void) {
  try { f(); passed++; console.log(`  ok   ${n}`); }
  catch (e) { failed++; console.log(`  FAIL ${n}\n       ${String(e)}`); }
}

test('"todos" deixa passar qualquer tarefa', () => {
  assert.ok(combinaComProjeto({ projectId: 'p1' }, TODOS_PROJETOS));
  assert.ok(combinaComProjeto({ projectId: null }, TODOS_PROJETOS));
});

test('"sem projeto" pega a avulsa', () => {
  assert.ok(combinaComProjeto({ projectId: null }, SEM_PROJETO));
  assert.ok(combinaComProjeto({}, SEM_PROJETO));
  assert.ok(combinaComProjeto({ projectId: undefined }, SEM_PROJETO));
});

test('"sem projeto" trata string vazia como avulsa', () => {
  // A API grava opcional; nem toda origem manda undefined.
  assert.ok(combinaComProjeto({ projectId: '' }, SEM_PROJETO));
});

test('"sem projeto" NÃO pega tarefa de projeto', () => {
  assert.ok(!combinaComProjeto({ projectId: 'p1' }, SEM_PROJETO));
});

test('id de projeto pega só o daquele projeto', () => {
  assert.ok(combinaComProjeto({ projectId: 'p1' }, 'p1'));
  assert.ok(!combinaComProjeto({ projectId: 'p2' }, 'p1'));
  assert.ok(!combinaComProjeto({ projectId: null }, 'p1'));
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
