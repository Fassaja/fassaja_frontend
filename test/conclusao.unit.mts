/**
 * Testes do resumo de conclusão.
 *
 * A regra existe por causa da faxina: tarefas concluídas somem do banco em 4
 * dias, então a taxa não pode ser calculada sobre o que está na tela. Estes
 * testes travam justamente isso — e o caso de divisão por zero.
 * Rodar: npm test
 */
import { resumoDeConclusao } from '../src/utils/conclusao.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const r = resumoDeConclusao(200, 50);
check('o total é o que já foi assumido, não o que está na tela', r.total === 250);
check('a taxa usa o contador vitalício', r.taxa === 80);
check('as concluídas não vêm da tela', r.concluidas === 200);

check('conta nova não divide por zero', resumoDeConclusao(0, 0).taxa === 0);
check('só abertas => 0%', resumoDeConclusao(0, 7).taxa === 0);
check('nada em aberto => 100%', resumoDeConclusao(9, 0).taxa === 100);

// O ponto todo: a taxa NÃO cai quando as concluídas somem da tela.
{
  const antes = resumoDeConclusao(200, 50).taxa;
  // Quatro dias depois, só 3 concluídas continuam visíveis — mas o contador
  // vitalício não mudou, e a taxa também não pode mudar.
  const depois = resumoDeConclusao(200, 50).taxa;
  check('a faxina não muda a taxa', antes === depois && antes === 80);
  // Enquanto a conta antiga, feita sobre o visível, desabava:
  const jeitoAntigo = Math.round((3 / (3 + 50)) * 100);
  check('a conta antiga daria 6% no mesmo cenário', jeitoAntigo === 6);
}

// Números vindos do banco e de sessão salva não são confiáveis para dividir.
check('negativo vira zero', resumoDeConclusao(-5, 10).concluidas === 0);
check('abertas negativas viram zero', resumoDeConclusao(10, -5).abertas === 0);
check('fracionário é truncado', resumoDeConclusao(10.9, 0).concluidas === 10);
check('NaN não contamina a taxa', resumoDeConclusao(Number.NaN, 4).taxa === 0);

// Arredondamento: 1 de 3 é 33%, não 33,33...
check('a taxa é inteira', Number.isInteger(resumoDeConclusao(1, 2).taxa));
check('1 de 3 => 33%', resumoDeConclusao(1, 2).taxa === 33);
check('2 de 3 => 67% (arredonda para cima)', resumoDeConclusao(2, 1).taxa === 67);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
