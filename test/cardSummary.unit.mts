/**
 * Testes da síntese dos cards de projeto e ideia (sem navegador).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import { projectSummary, ideaSummary } from '../src/utils/cardSummary.ts';

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

const hoje = new Date();
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const emDias = (n: number) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const tarefa = (over: Record<string, unknown> = {}) =>
  ({
    id: 'x',
    title: 'Tarefa',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    ...over,
  }) as never;

// --- projectSummary ----------------------------------------------------
check('projeto sem tarefas convida a criar', projectSummary([]).headline === 'Nenhuma tarefa ainda');
check('projeto sem tarefas é neutro', projectSummary([]).tone === 'neutral');

const tudoFeito = projectSummary([tarefa({ status: 'completed' }), tarefa({ status: 'completed' })]);
check('tudo concluído', tudoFeito.headline === 'Tudo concluído');
check('tudo concluído é positivo', tudoFeito.tone === 'positive');

const comAtraso = projectSummary([
  tarefa({ status: 'overdue' }),
  tarefa({ status: 'overdue' }),
  tarefa({ status: 'completed' }),
]);
check('atrasadas viram a manchete', comAtraso.headline === '2 tarefas atrasadas');
check('atrasadas pedem ação', comAtraso.tone === 'alert');

// Atrasada tem prioridade sobre a próxima a vencer, mas a próxima vira detalhe.
const atrasoComProxima = projectSummary([
  tarefa({ status: 'overdue' }),
  tarefa({ status: 'pending', dueDate: emDias(1) }),
]);
check('1 atrasada no singular', atrasoComProxima.headline === '1 tarefa atrasada');
check('a próxima vence amanhã, no detalhe', atrasoComProxima.detail === 'A próxima vence amanhã.');

// Sem atraso: a manchete é o prazo mais próximo.
const venceHoje = projectSummary([
  tarefa({ status: 'pending', dueDate: emDias(0), title: 'Enviar proposta' }),
  tarefa({ status: 'pending', dueDate: emDias(5) }),
]);
check('prazo de hoje vira manchete', venceHoje.headline === 'Vence hoje');
check('o título da tarefa vai no detalhe', venceHoje.detail === 'Enviar proposta');

// A mais próxima ganha, mesmo fora de ordem na lista.
const foraDeOrdem = projectSummary([
  tarefa({ status: 'pending', dueDate: emDias(9), title: 'Longe' }),
  tarefa({ status: 'pending', dueDate: emDias(2), title: 'Perto' }),
]);
check('escolhe o prazo mais próximo', foraDeOrdem.detail === 'Perto');

// Concluídas não devem ser consideradas como "próxima a vencer".
const concluidaComPrazo = projectSummary([
  tarefa({ status: 'completed', dueDate: emDias(1), title: 'Já feita' }),
  tarefa({ status: 'pending', title: 'Sem prazo' }),
]);
check(
  'ignora concluída ao procurar a próxima',
  concluidaComPrazo.headline === '1 tarefa em aberto',
);
check('avisa que não há prazo', concluidaComPrazo.detail === 'Nenhuma tem prazo definido.');

// --- ideaSummary -------------------------------------------------------
const ideia = (over: Record<string, unknown> = {}) =>
  ({
    id: 'i',
    title: 'Ideia',
    status: 'rascunho',
    priority: 'medium',
    color: '#2477FF',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...over,
  }) as never;

check('convertida', ideaSummary(ideia({ status: 'convertida' })).headline === 'Virou projeto');
check('convertida é positiva', ideaSummary(ideia({ status: 'convertida' })).tone === 'positive');

// Regressão: `isUnblocked` significa "foi liberada", NÃO "não tem trava".
// Uma ideia sem dependência nenhuma não pode aparecer como bloqueada.
const semDependencia = ideaSummary(ideia({ status: 'avaliando' }));
check('ideia sem dependência não é "esperando"', semDependencia.headline !== 'Esperando outro projeto');
check('ideia sem dependência cai no estágio', semDependencia.headline === 'Em avaliação');

const bloqueada = ideaSummary(
  ideia({ dependsOnProjectId: 'p1', dependsOnProjectName: 'Site novo', dependsOnProjectCompleted: false }),
);
check('bloqueada por projeto', bloqueada.headline === 'Esperando outro projeto');
check('nomeia o projeto que trava', bloqueada.detail === 'Depende de "Site novo" terminar.');

const liberada = ideaSummary(
  ideia({ dependsOnProjectId: 'p1', dependsOnProjectName: 'Site novo', dependsOnProjectCompleted: true }),
);
check('dependência concluída libera', liberada.headline === 'Liberada para começar');
check('liberada é positiva', liberada.tone === 'positive');

const revisaoVencida = ideaSummary(
  ideia({ reviewAt: new Date(Date.now() - 86400000).toISOString() }),
);
check('revisão vencida pede ação', revisaoVencida.headline === 'Revisão atrasada');
check('revisão vencida é alerta', revisaoVencida.tone === 'alert');

const revisaoFutura = ideaSummary(
  ideia({ reviewAt: new Date(Date.now() + 7 * 86400000).toISOString() }),
);
check('revisão futura informa a data', revisaoFutura.headline.startsWith('Revisar em '));

const comPrevisao = ideaSummary(ideia({ startTarget: '2026-11' }));
check('previsão por mês', comPrevisao.headline === 'Previsto para novembro de 2026');

// Bloqueio vence revisão vencida: sem destravar, revisar não muda nada.
const bloqueadaEVencida = ideaSummary(
  ideia({
    dependsOnProjectId: 'p1',
    dependsOnProjectCompleted: false,
    reviewAt: new Date(Date.now() - 86400000).toISOString(),
  }),
);
check('bloqueio tem precedência sobre revisão', bloqueadaEVencida.headline === 'Esperando outro projeto');

check('sempre devolve manchete não vazia', ideaSummary(ideia({ status: 'arquivada' })).headline.length > 0);

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
