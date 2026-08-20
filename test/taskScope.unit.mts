/**
 * Testes da separação Pessoal x Equipe em Minhas Tarefas (sem navegador).
 *
 * O que está em jogo: nenhuma tarefa pode DESAPARECER dos dois lados. Uma
 * tarefa invisível é pior que uma tarefa no lugar errado — o usuário não
 * procura o que não sabe que existe. Rodar: npm run test
 */
import {
  filterByScope,
  isTeamTask,
  loadScope,
  saveScope,
  teamProjectIds,
  escopoDoProjeto,
} from '../src/utils/taskScope.ts';
import type { Task } from '../src/types/task.ts';
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

const projetos: Project[] = [
  { id: 'p-solo', name: 'Pessoal', color: '#000', createdAt: '', type: 'solo' },
  { id: 'p-time', name: 'Time', color: '#000', createdAt: '', type: 'team' },
  // Sem `type` definido — projetos antigos, antes do campo existir.
  { id: 'p-legado', name: 'Legado', color: '#000', createdAt: '' },
];

function tarefa(id: string, projectId?: string): Task {
  return {
    id,
    title: id,
    status: 'pending',
    priority: 'medium',
    createdAt: '',
    projectId,
  };
}

const tarefas: Task[] = [
  tarefa('avulsa'), // sem projeto
  tarefa('minha', 'p-solo'),
  tarefa('do-time', 'p-time'),
  tarefa('legado', 'p-legado'),
  tarefa('orfa', 'p-apagado'), // projeto que não está mais na lista
];

console.log('\nSeparação Pessoal x Equipe');

const teamIds = teamProjectIds(projetos);
check('só o projeto marcado como team entra no lado Equipe',
  teamIds.size === 1 && teamIds.has('p-time'));

// --- Classificação individual ---------------------------------------------
check('tarefa sem projeto é pessoal', !isTeamTask(tarefa('x'), teamIds));
check('tarefa de projeto solo é pessoal', !isTeamTask(tarefa('x', 'p-solo'), teamIds));
check('tarefa de projeto de equipe é da equipe', isTeamTask(tarefa('x', 'p-time'), teamIds));
check('projeto sem type (legado) conta como pessoal',
  !isTeamTask(tarefa('x', 'p-legado'), teamIds));
// Quem sai de uma equipe deixa de enxergar o projeto. A tarefa precisa cair no
// lado pessoal — some dos dois lados seria perder o rastro dela.
check('tarefa de projeto que você não enxerga mais volta para o pessoal',
  !isTeamTask(tarefa('x', 'p-apagado'), teamIds));

// --- Os dois lados somam o todo -------------------------------------------
const solo = filterByScope(tarefas, teamIds, 'solo');
const time = filterByScope(tarefas, teamIds, 'team');
check('lado pessoal traz as 4 que não são de equipe', solo.length === 4);
check('lado equipe traz só a do projeto de equipe',
  time.length === 1 && time[0].id === 'do-time');
check('nenhuma tarefa some: os dois lados somam o total',
  solo.length + time.length === tarefas.length);
check('nenhuma tarefa aparece nos dois lados',
  !solo.some(s => time.some(t => t.id === s.id)));

// --- Sem equipes ----------------------------------------------------------
const semTime = teamProjectIds([projetos[0]]);
check('sem projeto de equipe, tudo é pessoal',
  filterByScope(tarefas, semTime, 'solo').length === tarefas.length);
check('sem projeto de equipe, o lado equipe fica vazio',
  filterByScope(tarefas, semTime, 'team').length === 0);

// --- Preferência salva ----------------------------------------------------
store = {};
check('o padrão é o lado pessoal', loadScope() === 'solo');
saveScope('team');
check('a escolha é lembrada', loadScope() === 'team');
saveScope('solo');
check('dá para voltar para o pessoal', loadScope() === 'solo');
store['fassaja_task_scope'] = 'lixo';
check('valor inválido no storage cai no pessoal', loadScope() === 'solo');

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
  loadScope();
  saveScope('team');
} catch {
  quebrou = true;
}
check('localStorage bloqueado não derruba a página', !quebrou);
globalThis.localStorage = real;

// --- Chegar por "Ver tarefas" de um projeto ---
// A lista tem que se ajustar ao que a pessoa pediu, nos DOIS sentidos: não
// adianta filtrar o projeto certo dentro do lado errado.
check('projeto de equipe pede o lado Equipe',
  escopoDoProjeto(projetos, 'p-time') === 'team');
check('projeto solo pede o lado Pessoal',
  escopoDoProjeto(projetos, 'p-solo') === 'solo');
check('projeto legado (sem type) pede o lado Pessoal',
  escopoDoProjeto(projetos, 'p-legado') === 'solo');
check('projeto fora da lista não decide nada (ainda carregando ou sem acesso)',
  escopoDoProjeto(projetos, 'p-inexistente') === null);
check('lista vazia não decide nada',
  escopoDoProjeto([], 'p-time') === null);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
