/**
 * Testes do relógio do timer.
 *
 * A regra que estes testes travam: o tempo restante é uma SUBTRAÇÃO, não uma
 * contagem. É o que faz o número estar certo depois de bloquear o celular.
 * Rodar: npm test
 */
import { formatarRelogio, progressoDaSessao, segundosAte } from '../src/utils/timer.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const INICIO = new Date('2026-08-22T10:00:00Z');
const emMin = (m: number) => new Date(INICIO.getTime() + m * 60000);
const FIM = emMin(25).toISOString();

check('no começo faltam 25 minutos', segundosAte(FIM, INICIO) === 1500);
check('no meio falta a metade', segundosAte(FIM, emMin(12.5)) === 750);
check('no fim exato falta zero', segundosAte(FIM, emMin(25)) === 0);
check('depois do fim nunca fica negativo', segundosAte(FIM, emMin(90)) === 0);
// O caso que dá sentido a tudo: o celular ficou bloqueado meia hora.
check('voltar muito depois mostra zero, não um número velho',
  segundosAte(FIM, emMin(60 * 5)) === 0);
check('data inválida não quebra a tela', segundosAte('nao-e-data', INICIO) === 0);

check('formata minutos e segundos', formatarRelogio(1500) === '25:00');
check('com zero à esquerda', formatarRelogio(65) === '01:05');
check('zero é 00:00', formatarRelogio(0) === '00:00');
check('negativo não vaza para a tela', formatarRelogio(-30) === '00:00');
check('acima de uma hora ganha o campo das horas', formatarRelogio(3661) === '1:01:01');

check('progresso começa em 0', progressoDaSessao(INICIO.toISOString(), FIM, INICIO) === 0);
check('na metade, 50', progressoDaSessao(INICIO.toISOString(), FIM, emMin(12.5)) === 50);
check('no fim, 100', progressoDaSessao(INICIO.toISOString(), FIM, emMin(25)) === 100);
check('passando do fim não ultrapassa 100',
  progressoDaSessao(INICIO.toISOString(), FIM, emMin(50)) === 100);
check('duração zero não divide por zero',
  progressoDaSessao(INICIO.toISOString(), INICIO.toISOString(), INICIO) === 100);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
