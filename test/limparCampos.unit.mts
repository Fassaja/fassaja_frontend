/**
 * Apagar um campo de uma tarefa. Rodar: npm run test
 *
 * O defeito que motiva o arquivo: o modal de edição mandava
 * `projectId: formData.projectId || undefined`, e `undefined` some do JSON —
 * o servidor lê a ausência como "não mexa neste campo". Resultado: escolher
 * "Sem projeto" não desvinculava nada e apagar os detalhes não salvava; os
 * dois voltavam na próxima abertura, sem nenhum erro na tela.
 *
 * Quem apaga é `null` (vínculo) ou `''` (texto e data). Esta é a tradução
 * entre esse vocabulário e o da tarefa lida, onde apagado é "ausente".
 */
import { aplicarAtualizacao } from '../src/utils/taskUpdate.ts';
import type { Task } from '../src/types/task.ts';

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

const base = {
  id: 't1',
  title: 'Enviar o relatório',
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-09-24T12:00:00.000Z',
  projectId: 'proj-1',
  description: 'com os números de agosto',
  dueDate: '2026-10-01',
  dependsOnId: 't0',
} as unknown as Task;

check('projectId null desvincula', aplicarAtualizacao(base, { projectId: null }).projectId === undefined);
check("description '' limpa", aplicarAtualizacao(base, { description: '' }).description === undefined);
check("dueDate '' tira o prazo", aplicarAtualizacao(base, { dueDate: '' }).dueDate === undefined);
check('dependsOnId null desfaz', aplicarAtualizacao(base, { dependsOnId: null }).dependsOnId === undefined);

// O outro lado da regra, e o que impede a correção de virar um apagador
// geral: campo que não veio na atualização não pode ser tocado.
const soTitulo = aplicarAtualizacao(base, { title: 'Outro título' });
check('título muda', soTitulo.title === 'Outro título');
check('projeto sobrevive a uma edição que não o cita', soTitulo.projectId === 'proj-1');
check('detalhes sobrevivem', soTitulo.description === 'com os números de agosto');
check('prazo sobrevive', soTitulo.dueDate === '2026-10-01');
check('dependência sobrevive', soTitulo.dependsOnId === 't0');

check(
  'trocar de projeto continua funcionando',
  aplicarAtualizacao(base, { projectId: 'proj-2' }).projectId === 'proj-2',
);

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed === 0 ? 0 : 1);
