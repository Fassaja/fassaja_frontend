/**
 * FE-01 — resposta antiga não repovoa dados depois que a identidade muda.
 *
 * Exercita `carregarSePertence`/`aplicarSePertence`, que são o corpo usado
 * pelos provedores de dados (Tasks, Projects, Tags, Events, Ideas, Focus,
 * Notifications, workspaces, equipe). Cada caso reproduz uma das travessias
 * citadas no achado: A → visitante, A → B, 401 antigo, rollback atrasado.
 *
 * Rodar: npm run test
 */
import {
  identidadeDe,
  contaDaIdentidade,
  aindaVale,
  carregarSePertence,
  aplicarSePertence,
  CONTA_VISITANTE,
} from '../src/utils/identidadeDeSessao.ts';

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

// --- forma da identidade ------------------------------------------------
check('conta + geração', identidadeDe('u1', 0) === 'u1#0');
check('visitante tem identidade própria', identidadeDe(null, 3) === `${CONTA_VISITANTE}#3`);
check('undefined é visitante', identidadeDe(undefined, 1) === `${CONTA_VISITANTE}#1`);
check('mesma conta, geração nova => outra identidade', identidadeDe('u1', 0) !== identidadeDe('u1', 1));
check('contas diferentes na mesma geração diferem', identidadeDe('u1', 0) !== identidadeDe('u2', 0));
check('extrai a conta', contaDaIdentidade(identidadeDe('u1', 7)) === 'u1');
check('aindaVale compara por igualdade', aindaVale('u1#0', 'u1#0') && !aindaVale('u1#0', 'u1#1'));

// --- laboratório: uma sessão que troca no meio do voo -------------------
function laboratorio() {
  let atual = identidadeDe('A', 0);
  const estado = { dados: [] as string[], erro: null as Error | null, carregando: true };
  return {
    atual: () => atual,
    trocarPara: (conta: string | null, geracao: number) => {
      atual = identidadeDe(conta, geracao);
    },
    estado,
    aoReceber: (dados: string[]) => { estado.dados = dados; },
    aoFalhar: (erro: Error) => { estado.erro = erro; },
    aoTerminar: () => { estado.carregando = false; },
  };
}

function pendente<T>() {
  let resolver: (v: T) => void = () => {};
  let rejeitar: (e: Error) => void = () => {};
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}

// 1) A → visitante: a resposta de A chega DEPOIS do logout.
{
  const lab = laboratorio();
  const req = pendente<string[]>();
  const carga = carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: () => req.promessa,
    aoReceber: lab.aoReceber,
    aoFalhar: lab.aoFalhar,
    aoTerminar: lab.aoTerminar,
  });
  lab.trocarPara(null, 1); // logout
  req.resolver(['CONTEUDO PRIVADO DE A']);
  await carga;
  check('A → visitante: dados de A não entram na tela', lab.estado.dados.length === 0);
  check('A → visitante: o "carregando" da sessão antiga não desliga a nova', lab.estado.carregando === true);
}

// 2) A → B sem passar por visitante (o caso que `isGuest` não enxergava).
{
  const lab = laboratorio();
  const req = pendente<string[]>();
  const carga = carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: () => req.promessa,
    aoReceber: lab.aoReceber,
  });
  lab.trocarPara('B', 1);
  req.resolver(['PROJETO PRIVADO DE A']);
  await carga;
  check('A → B: nada de A aparece na sessão B', lab.estado.dados.length === 0);
}

// 3) 401 antigo chegando depois do login de B não vira erro na tela de B.
{
  const lab = laboratorio();
  const req = pendente<string[]>();
  const carga = carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: () => req.promessa,
    aoReceber: lab.aoReceber,
    aoFalhar: lab.aoFalhar,
    aoTerminar: lab.aoTerminar,
  });
  lab.trocarPara('B', 1);
  req.rejeitar(Object.assign(new Error('401'), { status: 401 }));
  await carga;
  check('401 de A não vira erro na sessão B', lab.estado.erro === null);
  check('401 de A não mexe no carregando de B', lab.estado.carregando === true);
}

// 4) Caminho feliz: sem troca, tudo se aplica normalmente.
{
  const lab = laboratorio();
  await carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: async () => ['tarefa 1'],
    aoReceber: lab.aoReceber,
    aoTerminar: lab.aoTerminar,
  });
  check('sem troca: os dados entram', lab.estado.dados[0] === 'tarefa 1');
  check('sem troca: o carregando desliga', lab.estado.carregando === false);
}

// 5) Erro comum (rede) na MESMA sessão continua sendo mostrado.
{
  const lab = laboratorio();
  await carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: async () => { throw new Error('rede'); },
    aoReceber: lab.aoReceber,
    aoFalhar: lab.aoFalhar,
    aoTerminar: lab.aoTerminar,
  });
  check('erro da própria sessão aparece', lab.estado.erro?.message === 'rede');
  check('erro da própria sessão desliga o carregando', lab.estado.carregando === false);
}

// 6) Rollback atrasado de uma ação otimista de A não pode ressuscitar a tarefa
//    de A dentro da sessão B — é o caso que o AbortController não cobre.
{
  const lab = laboratorio();
  const daIdentidade = lab.atual();
  let lista: string[] = ['tarefa de B'];
  lab.trocarPara('B', 1);
  aplicarSePertence(daIdentidade, lab.atual, () => { lista = ['tarefa de A (desfeita)']; });
  check('rollback de A não altera a lista de B', lista[0] === 'tarefa de B');

  const deB = lab.atual();
  aplicarSePertence(deB, lab.atual, () => { lista = ['rollback legítimo de B']; });
  check('rollback da própria sessão continua funcionando', lista[0] === 'rollback legítimo de B');
}

// 7) Voltar para a MESMA conta numa geração nova também invalida o que ficou
//    em voo: o cookie pode ter sido revogado no meio.
{
  const lab = laboratorio();
  const req = pendente<string[]>();
  const carga = carregarSePertence({
    identidade: lab.atual(),
    atual: lab.atual,
    buscar: () => req.promessa,
    aoReceber: lab.aoReceber,
  });
  lab.trocarPara('A', 2); // saiu e entrou de novo na mesma conta
  req.resolver(['resposta da sessão anterior de A']);
  await carga;
  check('mesma conta, sessão nova: resposta antiga é descartada', lab.estado.dados.length === 0);
}

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
