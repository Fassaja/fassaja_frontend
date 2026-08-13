/**
 * Testes da regra "projeto concluído sai da lista" (sem navegador).
 *
 * O risco aqui é sumir com projeto que ainda importa: some cedo demais e a
 * pessoa acha que perdeu o trabalho; nunca some e a tela vira arquivo morto.
 * Rodar: npm run test
 */
import {
  HIDE_COMPLETED_AFTER_DAYS,
  isCompletedAndExpired,
  splitByVisibility,
} from '../src/utils/projectVisibility.ts';
import type { Project } from '../src/types/project.ts';

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

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-08-11T12:00:00Z').getTime();

function projeto(id: string, completedAt?: string): Project {
  return { id, name: id, color: '#000', createdAt: '', completedAt };
}

const emAndamento = projeto('em-andamento');
const recemConcluido = projeto('recem', new Date(AGORA - 1 * DIA).toISOString());
const noLimite = projeto('limite', new Date(AGORA - HIDE_COMPLETED_AFTER_DAYS * DIA).toISOString());
const antigo = projeto('antigo', new Date(AGORA - 30 * DIA).toISOString());

console.log('\nVisibilidade de projetos concluídos');

check('projeto em andamento nunca some', !isCompletedAndExpired(emAndamento, AGORA));
check('concluído ontem continua visível', !isCompletedAndExpired(recemConcluido, AGORA));
check(`concluído há ${HIDE_COMPLETED_AFTER_DAYS - 1} dias continua visível`,
  !isCompletedAndExpired(
    projeto('quase', new Date(AGORA - (HIDE_COMPLETED_AFTER_DAYS - 1) * DIA).toISOString()),
    AGORA,
  ));
check(`no dia ${HIDE_COMPLETED_AFTER_DAYS} exato já sai da lista`,
  isCompletedAndExpired(noLimite, AGORA));
check('concluído há 30 dias sai da lista', isCompletedAndExpired(antigo, AGORA));

// Uma data ilegível não pode virar motivo para o projeto desaparecer.
check('data inválida mantém o projeto visível',
  !isCompletedAndExpired(projeto('corrompido', 'nao-e-data'), AGORA));

// --- A divisão não pode perder nem duplicar nada -------------------------
const todos = [emAndamento, recemConcluido, noLimite, antigo];
const { visible, hidden } = splitByVisibility(todos, AGORA);
check('a grade fica com os 2 ativos/recentes', visible.length === 2);
check('o arquivo fica com os 2 antigos', hidden.length === 2);
check('nenhum projeto some da soma', visible.length + hidden.length === todos.length);
check('nenhum projeto aparece nos dois lados',
  !visible.some(v => hidden.some(h => h.id === v.id)));
check('o que está na grade é o esperado',
  visible.map(p => p.id).join(',') === 'em-andamento,recem');

// O prazo precisa ser maior que os 4 dias de retenção das tarefas concluídas,
// senão o projeto some antes das próprias tarefas.
check('o prazo é maior que a retenção de tarefas concluídas (4 dias)',
  HIDE_COMPLETED_AFTER_DAYS > 4);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
