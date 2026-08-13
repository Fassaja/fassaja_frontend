/**
 * Testes da lógica de Ideias (sem navegador).
 *
 * Duas coisas precisam estar certas: a previsão de início não pode "andar" um
 * dia por causa de fuso, e o sino não pode avisar sobre ideia que já virou
 * projeto. Rodar: npm run test
 */
import {
  IDEA_STATUS_META,
  SELECTABLE_STATUS,
  countIdeas,
  formatStartTarget,
  isReviewDue,
  isUnblocked,
  monthOptions,
  needsAttention,
  statusMeta,
} from '../src/utils/ideaStatus.ts';
import type { Idea } from '../src/types/idea.ts';

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

const AGORA = new Date('2026-08-13T12:00:00Z').getTime();
const DIA = 24 * 60 * 60 * 1000;

function ideia(over: Partial<Idea> = {}): Idea {
  return {
    id: 'i1',
    title: 'Ideia',
    status: 'rascunho',
    priority: 'medium',
    color: '#2477FF',
    createdAt: '',
    updatedAt: '',
    tags: [],
    ...over,
  };
}

console.log('\nIdeias');

// --- Previsão de início ---------------------------------------------------
// O motivo de formatar à mão: new Date('2026-11-15') é lido como UTC e vira
// 14/11 para quem está no Brasil. A data que a pessoa digitou tem que voltar
// igual.
check('mês sozinho vira "novembro de 2026"',
  formatStartTarget('2026-11') === 'novembro de 2026');
check('data completa não anda um dia (fuso)',
  formatStartTarget('2026-11-15') === '15/11/2026');
check('primeiro de janeiro continua 01/01', formatStartTarget('2027-01-01') === '01/01/2027');
check('sem previsão devolve nulo', formatStartTarget(undefined) === null);
check('mês inválido não quebra', formatStartTarget('2026-99') === null);

// --- Dependência de projeto ----------------------------------------------
check('sem dependência não está liberada', !isUnblocked(ideia()));
check('dependência ainda em andamento não libera',
  !isUnblocked(ideia({ dependsOnProjectId: 'p1', dependsOnProjectCompleted: false })));
check('dependência concluída libera',
  isUnblocked(ideia({ dependsOnProjectId: 'p1', dependsOnProjectCompleted: true })));

// --- Revisão --------------------------------------------------------------
check('sem data de revisão nada vence', !isReviewDue(ideia(), AGORA));
check('revisão no futuro ainda não venceu',
  !isReviewDue(ideia({ reviewAt: new Date(AGORA + DIA).toISOString() }), AGORA));
check('revisão no passado venceu',
  isReviewDue(ideia({ reviewAt: new Date(AGORA - DIA).toISOString() }), AGORA));
check('data de revisão ilegível não vence (nem quebra)',
  !isReviewDue(ideia({ reviewAt: 'qualquer coisa' }), AGORA));

// --- Quem pede atenção ----------------------------------------------------
const vencida = { reviewAt: new Date(AGORA - DIA).toISOString() };
check('ideia com revisão vencida pede atenção', needsAttention(ideia(vencida), AGORA));
// Estes dois são o ponto: avisar sobre uma ideia que já virou projeto mandaria
// a pessoa decidir de novo algo que ela já decidiu.
check('ideia CONVERTIDA não pede atenção',
  !needsAttention(ideia({ ...vencida, status: 'convertida' }), AGORA));
check('ideia ARQUIVADA não pede atenção',
  !needsAttention(ideia({ ...vencida, status: 'arquivada' }), AGORA));
check('ideia liberada pela dependência pede atenção',
  needsAttention(ideia({ dependsOnProjectId: 'p1', dependsOnProjectCompleted: true }), AGORA));
check('ideia comum não pede atenção', !needsAttention(ideia(), AGORA));

// --- Estágios -------------------------------------------------------------
check('existem 6 estágios', IDEA_STATUS_META.length === 6);
check('"convertida" não é escolhível pelo usuário',
  !SELECTABLE_STATUS.some(s => s.value === 'convertida'));
check('todo estágio tem rótulo e cor',
  IDEA_STATUS_META.every(s => !!s.label && /^#[0-9A-F]{6}$/i.test(s.color)));
check('statusMeta encontra o estágio', statusMeta('pronta').label === 'Pronta para começar');

// --- Opções de mês --------------------------------------------------------
// Substituem o <input type="month">, que o Safari não suporta.
const meses = monthOptions(24, new Date(2026, 10, 5)); // novembro/2026
check('a lista começa no mês atual', meses[0].value === '2026-11');
check('o rótulo é por extenso', meses[0].label === 'novembro de 2026');
check('vira o ano corretamente', meses[2].value === '2027-01');
check('o rótulo acompanha a virada', meses[2].label === 'janeiro de 2027');
check('gera a quantidade pedida', meses.length === 24);
check('todo valor casa com o formato do back-end',
  meses.every(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m.value)));
check('o formatador entende o que este seletor produz',
  formatStartTarget(meses[5].value) === meses[5].label);

// --- Resumo ---------------------------------------------------------------
const lista = [
  ideia({ id: '1', status: 'rascunho' }),
  ideia({ id: '2', status: 'planejada' }),
  ideia({ id: '3', status: 'planejada' }),
  ideia({ id: '4', status: 'pronta' }),
  ideia({ id: '5', status: 'arquivada' }),
  ideia({ id: '6', status: 'arquivada' }),
];
const c = countIdeas(lista);
check('o total ignora as arquivadas', c.total === 4);
check('conta as planejadas', c.planejadas === 2);
check('conta as prontas', c.prontas === 1);
check('conta as arquivadas à parte', c.arquivadas === 2);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
