/**
 * Qual prova a exclusão de conta exige. Rodar: npm run test
 *
 * O caso que motiva o arquivo é o `undefined`: `hasPassword` é opcional, e uma
 * sessão vinda de cache antigo chega sem ele. Se isso caísse no caminho do
 * e-mail, quem tem senha ficaria esperando uma mensagem que nunca sai.
 */
import { provaDeExclusao } from '../src/utils/exclusaoDeConta.ts';

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

check('conta com senha confirma com a senha', provaDeExclusao(true) === 'senha');
check('conta sem senha confirma pelo e-mail', provaDeExclusao(false) === 'email');
check(
  'campo ausente cai no caminho da SENHA (default seguro)',
  provaDeExclusao(undefined) === 'senha',
);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exit(1);
