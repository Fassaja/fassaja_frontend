/**
 * FE-07 — saída local imediata, revogação remota honesta.
 *
 * Cobre: logout recusado/rede indisponível, resposta atrasada chegando depois
 * de um login novo, e a ausência de repetição automática (um retry antigo
 * revogaria a sessão nova).
 *
 * Rodar: npm run test
 */
import {
  revogarSessao,
  aguardarRevogacaoPendente,
  ultimaRevogacao,
  _reiniciarRevogacao,
} from '../src/utils/revogacaoDeSessao.ts';

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

function pendente<T>() {
  let resolver: (v: T) => void = () => {};
  let rejeitar: (e: Error) => void = () => {};
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}

// 1) Servidor confirma.
_reiniciarRevogacao();
check('confirmada quando o servidor responde', (await revogarSessao(async () => undefined)) === 'confirmada');
check('o último resultado fica registrado', ultimaRevogacao() === 'confirmada');

// 2) Rede indisponível / 500: não lança, e não se afirma que a sessão morreu.
_reiniciarRevogacao();
check(
  'sem-resposta quando a rede falha',
  (await revogarSessao(async () => { throw new Error('offline'); })) === 'sem-resposta',
);
check('sem-resposta fica registrado (a UI pode avisar)', ultimaRevogacao() === 'sem-resposta');

// 3) Ordem: o login novo ESPERA a revogação pendente terminar.
{
  _reiniciarRevogacao();
  const req = pendente<void>();
  const ordem: string[] = [];
  const revogacao = revogarSessao(() => req.promessa.then(() => ordem.push('logout respondeu')));
  const login = aguardarRevogacaoPendente(1000).then(() => ordem.push('login enviado'));
  req.resolver();
  await Promise.all([revogacao, login]);
  check('o login só sai depois da resposta do logout', ordem.join(' | ') === 'logout respondeu | login enviado');
}

// 4) Sem revogação pendente, o login não espera nada.
_reiniciarRevogacao();
check('sem revogação pendente não há espera', (await aguardarRevogacaoPendente(1000)) === 'sem-revogacao');

// 5) Rede pendurada: o prazo estoura e o login segue — travar a entrada seria pior.
{
  _reiniciarRevogacao();
  const nunca = pendente<void>();
  void revogarSessao(() => nunca.promessa);
  const r = await aguardarRevogacaoPendente(5, setTimeout);
  check('prazo esgotado libera o login', r === 'prazo-esgotado');
}

// 6) Uma tentativa só: nada aqui repete o pedido sozinho. Um retry antigo
//    chegando depois do login novo revogaria a sessão NOVA.
{
  _reiniciarRevogacao();
  let chamadas = 0;
  await revogarSessao(async () => { chamadas++; throw new Error('500'); });
  await new Promise(r => setTimeout(r, 20));
  check('a revogação não é repetida automaticamente', chamadas === 1);
}

// 7) Uma revogação nova substitui a anterior como pendente (a espera vale para
//    a mais recente, não para uma antiga que ficou pendurada).
{
  _reiniciarRevogacao();
  const velha = pendente<void>();
  void revogarSessao(() => velha.promessa);
  await revogarSessao(async () => undefined);
  check('depois de uma revogação concluída não sobra pendência', (await aguardarRevogacaoPendente(5)) === 'sem-revogacao');
  velha.resolver();
}

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
