/**
 * Testes do aviso de "tem mais coisa abaixo".
 *
 * A borda de baixo é a única pista de que a lista continua. Errar para menos
 * esconde conteúdo; errar para mais deixa uma sombra piscando no fim.
 * Rodar: npm test
 */
import { haMaisAbaixo } from '../src/utils/rolagem.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

// Caixa de 300px mostrando um conteúdo de 900px.
check('no topo, há muito abaixo', haMaisAbaixo(0, 900, 300));
check('no meio, ainda há abaixo', haMaisAbaixo(300, 900, 300));
check('no fim exato, não há mais nada', !haMaisAbaixo(600, 900, 300));

// Conteúdo que cabe inteiro: nunca há sombra.
check('conteúdo menor que a caixa não avisa', !haMaisAbaixo(0, 200, 300));
check('conteúdo do tamanho exato da caixa não avisa', !haMaisAbaixo(0, 300, 300));

// O resto fracionário do fim da rolagem em tela com escala.
check('sobra de meio pixel no fim não acende a sombra',
  !haMaisAbaixo(599.5, 900, 300));
check('sobra de 3px ainda conta como fim', !haMaisAbaixo(597, 900, 300));
check('5px restantes já é conteúdo de verdade', haMaisAbaixo(595, 900, 300));

// A folga é ajustável para quem precisar de outra sensibilidade.
check('folga maior desliga a sombra mais cedo', !haMaisAbaixo(590, 900, 300, 20));
check('folga zero é literal', haMaisAbaixo(599.9, 900, 300, 0));

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
