/**
 * Testes do avanço dos passos da geração.
 *
 * O que está travado aqui: o índice NUNCA sai da lista. Sem isso, uma resposta
 * demorada faria o contador passar do fim do array e a tela ficaria em branco
 * justo durante a espera. Rodar: npm test
 */
import { PASSOS_DA_GERACAO, MS_POR_PASSO, proximoPasso } from '../src/utils/passosDaGeracao.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const N = PASSOS_DA_GERACAO.length;

check('há passos para mostrar', N > 0);
check('nenhum passo vem em branco', PASSOS_DA_GERACAO.every(p => p.trim().length > 0));
check('o intervalo é positivo', MS_POR_PASSO > 0);

check('avança do primeiro para o segundo', proximoPasso(0, 3) === 1);
check('avança do segundo para o terceiro', proximoPasso(1, 3) === 2);

// O essencial: a resposta pode demorar mais que os passos somados.
check('trava no último em vez de sair da lista', proximoPasso(2, 3) === 2);
check('continua travado por mais que chamem', proximoPasso(99, 3) === 2);

check('lista de um passo só fica nele', proximoPasso(0, 1) === 0);
// Lista vazia não pode virar índice negativo.
check('lista vazia não vira índice negativo', proximoPasso(0, 0) === 0);

// Todo índice alcançável existe de verdade na lista.
let i = 0;
let valido = true;
for (let n = 0; n < 20; n++) {
  i = proximoPasso(i, N);
  if (PASSOS_DA_GERACAO[i] === undefined) valido = false;
}
check('20 avanços seguidos e todo índice ainda aponta para um passo real', valido);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
