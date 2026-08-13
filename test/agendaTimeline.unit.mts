/**
 * Testes unitários da timeline da Agenda (sem navegador).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import {
  toMinutes,
  startOfWeek,
  packOverlaps,
  plusOneHour,
} from '../src/utils/agendaTimeline.ts';

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

// --- toMinutes ---------------------------------------------------------
check('meia-noite = 0', toMinutes('00:00') === 0);
check('09:30 = 570', toMinutes('9:30') === 570);
check('23:59 = 1439', toMinutes('23:59') === 1439);
check('vazio => null', toMinutes('') === null);
check('undefined => null', toMinutes(undefined) === null);
check('null => null', toMinutes(null) === null);
check('formato inválido => null', toMinutes('abc') === null);
check('hora fora da faixa => null', toMinutes('24:00') === null);
check('minuto fora da faixa => null', toMinutes('10:60') === null);

// --- plusOneHour -------------------------------------------------------
check('09:00 => 10:00', plusOneHour('09:00') === '10:00');
check('09:30 => 10:30', plusOneHour('09:30') === '10:30');
check('preenche o zero à esquerda', plusOneHour('08:05') === '09:05');
// Não vira o dia: 23:30 + 1h viraria 00:30 e ficaria ANTES do início.
check('satura em 23:59', plusOneHour('23:30') === '23:59');
check('23:00 => 23:59 (não 00:00)', plusOneHour('23:00') === '23:59');
check('entrada inválida => padrão', plusOneHour('xx:yy') === '10:00');

// --- startOfWeek -------------------------------------------------------
// 2026-08-13 é uma quinta-feira; o domingo da semana é 09/08.
const week = startOfWeek(new Date(2026, 7, 13));
check('quinta => domingo anterior', week.getDate() === 9 && week.getMonth() === 7);
check('startOfWeek zera a hora', week.getHours() === 0 && week.getMinutes() === 0);
// Domingo é o próprio início da semana, não a semana anterior.
const sunday = startOfWeek(new Date(2026, 7, 9));
check('domingo => ele mesmo', sunday.getDate() === 9);
// Atravessa a virada de mês sem cair no mês errado.
const crossing = startOfWeek(new Date(2026, 8, 2)); // qua 02/09/2026
check('virada de mês => 30/08', crossing.getDate() === 30 && crossing.getMonth() === 7);

// --- packOverlaps ------------------------------------------------------
const byStart = (a: { start: number }, b: { start: number }) => a.start - b.start;

// Eventos que não se cruzam ocupam a largura toda.
const disjoint = packOverlaps([
  { start: 540, end: 600 },
  { start: 660, end: 720 },
]).sort(byStart);
check('disjuntos => 1 coluna cada', disjoint.every(e => e.cols === 1 && e.col === 0));

// Dois sobrepostos dividem a largura ao meio.
const pair = packOverlaps([
  { start: 540, end: 660 }, // 09:00-11:00
  { start: 600, end: 720 }, // 10:00-12:00
]).sort(byStart);
check('2 sobrepostos => 2 colunas', pair.every(e => e.cols === 2));
check('2 sobrepostos => colunas distintas', pair[0].col !== pair[1].col);

// Três simultâneos => três colunas.
const triple = packOverlaps([
  { start: 540, end: 600 },
  { start: 545, end: 605 },
  { start: 550, end: 610 },
]);
check('3 simultâneos => 3 colunas', triple.every(e => e.cols === 3));
check('3 simultâneos => colunas 0,1,2', new Set(triple.map(e => e.col)).size === 3);

// Encostar não é sobrepor: 09-10 e 10-11 podem usar a mesma coluna.
const touching = packOverlaps([
  { start: 540, end: 600 },
  { start: 600, end: 660 },
]).sort(byStart);
check('fim == início não sobrepõe', touching.every(e => e.cols === 1));

// Grupos independentes não contaminam a largura um do outro: o par da manhã
// divide ao meio, e o evento isolado da tarde continua inteiro.
const groups = packOverlaps([
  { start: 540, end: 660 },
  { start: 600, end: 720 },
  { start: 900, end: 960 },
]).sort(byStart);
check('grupos separados => larguras independentes', groups[2].cols === 1);
check('grupo da manhã preservado', groups[0].cols === 2 && groups[1].cols === 2);

// Um evento longo mantém o grupo aberto e força as colunas dos que cabem dentro.
const nested = packOverlaps([
  { start: 540, end: 900 }, // 09:00-15:00
  { start: 600, end: 660 }, // 10:00-11:00
  { start: 720, end: 780 }, // 12:00-13:00
]).sort(byStart);
check('evento longo => todos no mesmo grupo', nested.every(e => e.cols === 2));
check('os dois curtos reusam a mesma coluna', nested[1].col === nested[2].col);

check('não perde nem duplica eventos', packOverlaps([
  { start: 540, end: 600 },
  { start: 545, end: 605 },
  { start: 900, end: 960 },
]).length === 3);

// Entrada vazia não quebra.
check('lista vazia => lista vazia', packOverlaps([]).length === 0);

// Preserva os campos extras do objeto original.
const withId = packOverlaps([{ start: 540, end: 600, id: 'abc' }]);
check('preserva campos extras', withId[0].id === 'abc');

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
