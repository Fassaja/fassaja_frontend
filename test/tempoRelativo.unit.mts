/**
 * Testes do "quanto tempo faz".
 *
 * Data FIXA de propósito: um teste de tempo que usa o relógio de verdade
 * passa hoje e falha às 23h59 — já aconteceu neste projeto.
 * Rodar: npm test
 */
import { tempoRelativo } from '../src/utils/date.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const AGORA = new Date('2026-08-20T15:00:00Z');
const atras = (ms: number) => new Date(AGORA.getTime() - ms).toISOString();
const SEG = 1000, MIN = 60 * SEG, HORA = 60 * MIN, DIA = 24 * HORA;

check('acabou de escrever', tempoRelativo(atras(5 * SEG), AGORA) === 'agora');
check('59s ainda é agora', tempoRelativo(atras(59 * SEG), AGORA) === 'agora');
check('1 min vira minutos', tempoRelativo(atras(MIN), AGORA) === 'há 1 min');
check('45 min', tempoRelativo(atras(45 * MIN), AGORA) === 'há 45 min');
check('59 min ainda é minutos', tempoRelativo(atras(59 * MIN), AGORA) === 'há 59 min');
check('1 h vira horas', tempoRelativo(atras(HORA), AGORA) === 'há 1 h');
check('23 h ainda é horas', tempoRelativo(atras(23 * HORA), AGORA) === 'há 23 h');
check('1 dia vira ontem', tempoRelativo(atras(DIA), AGORA) === 'ontem');
check('3 dias', tempoRelativo(atras(3 * DIA), AGORA) === 'há 3 dias');
check('6 dias ainda é dias', tempoRelativo(atras(6 * DIA), AGORA) === 'há 6 dias');

// Acima de uma semana "há 23 dias" não situa ninguém: volta a ser data.
check('7 dias vira data', /\d/.test(tempoRelativo(atras(7 * DIA), AGORA))
  && !tempoRelativo(atras(7 * DIA), AGORA).startsWith('há'));

// Relógio do aparelho adiantado não pode gerar "há -3 min".
check('futuro não vira número negativo', tempoRelativo(atras(-MIN), AGORA) === 'agora');
check('data inválida não quebra a lista', tempoRelativo('nao-e-data', AGORA) === '');

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
