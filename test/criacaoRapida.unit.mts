/**
 * Testes de tarefaDoTexto: o texto de uma linha vira os dados certos.
 * Rodar: npm test
 */
import { tarefaDoTexto } from '../src/utils/criacaoRapida.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const tags = [{ id: 'tg1', name: 'trabalho' }, { id: 'tg2', name: 'reunião' }];
const segunda = new Date(2026, 10, 23); // seg, 23/11/2026

const a = tarefaDoTexto('Ligar para o fornecedor amanhã !alta #trabalho', tags, 'pending', segunda);
check('título sem os marcadores', a?.title === 'Ligar para o fornecedor');
check('prazo de "amanhã"', a?.dueDate === '2026-11-24');
check('prioridade de "!alta"', a?.priority === 'high');
check('tag existente vira id', a?.tagIds?.[0] === 'tg1');

const b = tarefaDoTexto('Revisar texto #inexistente', tags, 'in_progress', segunda);
check('tag inexistente fica no título', b?.title === 'Revisar texto #inexistente' && b?.tagIds === undefined);
check('status da coluna é respeitado', b?.status === 'in_progress');
check('sem "!" a prioridade é média', b?.priority === 'medium');
check('sem data não inventa prazo', b?.dueDate === undefined);

check('só marcadores não cria', tarefaDoTexto('amanhã !alta', tags, 'pending', segunda) === null);
check('vazio não cria', tarefaDoTexto('   ', tags) === null);
check('tag com acento é achada sem acento', tarefaDoTexto('Pauta #reuniao', tags, 'pending', segunda)?.tagIds?.[0] === 'tg2');

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
