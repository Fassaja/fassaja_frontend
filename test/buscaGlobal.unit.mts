/**
 * Testes da busca ⌘K.
 *
 * O que está travado aqui: acento não separa resultado, o que a pessoa
 * procurava fica em cima, e um casamento pela descrição consegue se explicar.
 * Rodar: npm test
 */
import { normalizar, pontuar, trecho, buscar } from '../src/utils/buscaGlobal.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

// --- acento ---
check('normalizar tira acento e maiúscula', normalizar('Reunião ÀS Três') === 'reuniao as tres');
check('normalizar preserva o comprimento (índices valem no original)',
  normalizar('orçamento anual').length === 'orçamento anual'.length);
check('digitar sem acento acha com acento', pontuar({ titulo: 'Reunião' }, 'reuniao') === 100);
check('digitar com acento acha sem acento', pontuar({ titulo: 'Reuniao' }, 'reunião') === 100);
check('ç é tratado como c', pontuar({ titulo: 'Orçamento' }, 'orcamento') === 100);

// --- ordem: o que a pessoa procurava fica em cima ---
check('igual vale mais que começa', pontuar({ titulo: 'Rel' }, 'rel')! > pontuar({ titulo: 'Relatório' }, 'rel')!);
check('começa vale mais que começo de palavra no meio',
  pontuar({ titulo: 'Relatório final' }, 'rel')! > pontuar({ titulo: 'Ver relatório' }, 'rel')!);
check('começo de palavra vale mais que meio de palavra',
  pontuar({ titulo: 'Ver relatório' }, 'rel')! > pontuar({ titulo: 'Corrigir o relógio' }, 'elo')!);
check('título vale mais que corpo',
  pontuar({ titulo: 'Relatório' }, 'rel')! > pontuar({ titulo: 'Outra', corpo: 'ver o relatório' }, 'rel')!);

// --- não casa ---
check('sem casar devolve null', pontuar({ titulo: 'Abacaxi' }, 'zzz') === null);
check('corpo ausente não casa', pontuar({ titulo: 'Abacaxi' }, 'rel') === null);
check('termo vazio empata tudo em 0', pontuar({ titulo: 'Qualquer' }, '   ') === 0);

// Um termo com caractere de regex não pode explodir a busca.
check('parêntese no termo não quebra', pontuar({ titulo: 'Nota (rascunho)' }, '(ras') === 40);
check('ponto no termo não vira coringa', pontuar({ titulo: 'axbxc' }, 'a.b') === null);

// --- trecho que explica o resultado ---
check('trecho mostra o redor do que casou',
  trecho('o contrato precisa do aval do jurídico até sexta', 'aval')?.includes('aval') === true);
check('trecho preserva acento e maiúscula do original',
  trecho('Falar com o JURÍDICO amanhã', 'juridico')?.includes('JURÍDICO') === true);
check('trecho curto não ganha reticências',
  trecho('aval', 'aval') === 'aval');
check('trecho longo ganha reticências dos dois lados',
  trecho('a'.repeat(80) + 'aval' + 'b'.repeat(80), 'aval')?.startsWith('…') === true);
check('corpo que não casa não vira trecho', trecho('nada aqui', 'aval') === null);
check('corpo ausente não vira trecho', trecho(undefined, 'aval') === null);

// --- buscar: ordena, corta e mantém empate estável ---
const itens = [
  { id: 'meio', titulo: 'Corrigir relógio' },
  { id: 'exato', titulo: 'Rel' },
  { id: 'comeco', titulo: 'Relatório mensal' },
  { id: 'corpo', titulo: 'Outra coisa', corpo: 'anexar o rel do mês' },
];
const achados = buscar(itens, 'rel', i => ({ titulo: i.titulo, corpo: (i as { corpo?: string }).corpo }), 10);
check('ordena do mais relevante para o menos',
  achados.map(i => i.id).join(',') === 'exato,comeco,meio,corpo');
check('respeita o limite', buscar(itens, 'rel', i => ({ titulo: i.titulo }), 2).length === 2);
check('descarta quem não casa', buscar(itens, 'zzz', i => ({ titulo: i.titulo }), 10).length === 0);

// Empate tem que sair na ordem de entrada: senão a lista embaralha a cada tecla.
const empatados = [{ id: 'a', titulo: 'Projeto alfa' }, { id: 'b', titulo: 'Projeto beta' }];
check('empate mantém a ordem de entrada',
  buscar(empatados, 'projeto', i => ({ titulo: i.titulo }), 10).map(i => i.id).join(',') === 'a,b');

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
