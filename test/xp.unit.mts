/**
 * Testes de XP/nível (sem navegador).
 * Rodar: npm run test
 */
import { xpInfo, computeXp, XP_PER_LEVEL } from '../src/utils/xp.ts';

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

// --- xpInfo: total -> nível --------------------------------------------
check('0 XP começa no nível 1', xpInfo(0).level === 1);
check('99 XP ainda é nível 1', xpInfo(99).level === 1);
check('100 XP vira nível 2', xpInfo(100).level === 2);
check('250 XP é nível 3', xpInfo(250).level === 3);
check('sobra dentro do nível', xpInfo(250).intoLevel === 50);
check('barra em 50%', xpInfo(250).pctToNext === 50);
check('barra zera ao subir de nível', xpInfo(200).pctToNext === 0);
check('cada nível custa 100', XP_PER_LEVEL === 100);
// Defensivo: um total negativo (dessincronia) não pode virar nível 0 ou -1.
check('total negativo não quebra o nível', xpInfo(-30).level === 1);
check('total negativo vira 0', xpInfo(-30).xp === 0);

// --- computeXp: só o modo visitante ------------------------------------
const t = (priority: string, status = 'completed') =>
  ({ id: Math.random().toString(), title: 'x', status, priority, createdAt: '' }) as never;

check('pesos por prioridade', computeXp([t('low'), t('medium'), t('high')]).xp === 60);
check('conta as concluídas', computeXp([t('low'), t('medium')]).completedCount === 2);
check('pendente não pontua', computeXp([t('high', 'pending')]).xp === 0);
check('atrasada não pontua', computeXp([t('high', 'overdue')]).xp === 0);
check('lista vazia é nível 1', computeXp([]).level === 1);
// Prioridade fora do esperado não pode virar NaN e contaminar o total.
check('prioridade inválida vale 0', computeXp([t('urgentissima')]).xp === 0);
check('inválida não vira NaN', !Number.isNaN(computeXp([t('urgentissima'), t('low')]).xp));

// --- o bug que motivou tudo --------------------------------------------
// Dez tarefas médias = 200 XP, nível 3. Depois da faxina do servidor (4 dias),
// sobram quatro: 80 XP, nível 1. É por isso que o total agora vem do servidor,
// e `xpInfo` só traduz — o cálculo local ficou para o visitante, que não tem
// faxina nenhuma.
const dez = Array.from({ length: 10 }, () => t('medium'));
const quatro = Array.from({ length: 4 }, () => t('medium'));
check('antes da faxina: nível 3', computeXp(dez).level === 3);
check('depois da faxina: cairia para nível 1', computeXp(quatro).level === 1);
check('o total do servidor não cai', xpInfo(200).level === 3);

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
