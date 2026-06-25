/**
 * Testes unitários da lógica de lembretes da Agenda (sem navegador).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import {
  eventStartDate,
  eventEndDate,
  reminderTriggerDate,
  reminderLabel,
  ALL_DAY_ANCHOR,
} from '../src/utils/eventReminders.ts';

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

const base = { date: '2026-06-25', allDay: false };

// eventStartDate
const timed = eventStartDate({ ...base, startTime: '14:30' })!;
check('início de evento com horário', timed.getHours() === 14 && timed.getMinutes() === 30);

const allDay = eventStartDate({ date: '2026-06-25', allDay: true })!;
const [ah, am] = ALL_DAY_ANCHOR.split(':').map(Number);
check('dia inteiro ancora no ALL_DAY_ANCHOR', allDay.getHours() === ah && allDay.getMinutes() === am);

check('data inválida => null', eventStartDate({ date: '', allDay: false }) === null);

// reminderTriggerDate
const start = eventStartDate({ ...base, startTime: '14:00' })!;
const trigger15 = reminderTriggerDate({ ...base, startTime: '14:00', reminderMinutes: 15 })!;
check('lembrete 15 min antes', start.getTime() - trigger15.getTime() === 15 * 60000);

const trigger0 = reminderTriggerDate({ ...base, startTime: '14:00', reminderMinutes: 0 })!;
check('lembrete "no horário" = início', trigger0.getTime() === start.getTime());

check(
  'sem reminderMinutes => sem gatilho',
  reminderTriggerDate({ ...base, startTime: '14:00' }) === null,
);
check(
  'reminderMinutes null => sem gatilho',
  reminderTriggerDate({ ...base, startTime: '14:00', reminderMinutes: null }) === null,
);

// 1 dia antes cruza a meia-noite para o dia anterior
const triggerDay = reminderTriggerDate({ ...base, startTime: '09:00', reminderMinutes: 1440 })!;
check('lembrete 1 dia antes cai no dia 24', triggerDay.getDate() === 24);

// eventEndDate
const endTimed = eventEndDate({ ...base, startTime: '14:00', endTime: '15:30' })!;
check('fim usa endTime', endTimed.getHours() === 15 && endTimed.getMinutes() === 30);

const endNoEnd = eventEndDate({ ...base, startTime: '14:00' })!;
check('fim padrão = início + 1h', endNoEnd.getTime() - start.getTime() === 60 * 60000);

const endAllDay = eventEndDate({ date: '2026-06-25', allDay: true })!;
check('dia inteiro termina no fim do dia', endAllDay.getHours() === 23 && endAllDay.getMinutes() === 59);

// reminderLabel
check('label de 15 min', reminderLabel(15) === '15 minutos antes');
check('label de 60 min', reminderLabel(60) === '1 hora antes');
check('label nulo é vazio', reminderLabel(null) === '');
check('label fora da lista (90 min)', reminderLabel(90) === '90 min antes');

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
