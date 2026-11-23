/**
 * Testes da paleta de comandos: o filtro e o reconhecimento do pedido de
 * criação. O segundo é o que mais importa — um falso positivo cria tarefa
 * quando a pessoa só queria buscar.
 * Rodar: npm test
 */
import { COMANDOS, filtrarComandos, pedidoDeCriacao } from '../src/utils/comandos.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

// --- Pedido de criação --------------------------------------------------------
check('"+ comprar pão" cria', pedidoDeCriacao('+ comprar pão') === 'comprar pão');
check('"+comprar pão" (sem espaço) cria', pedidoDeCriacao('+comprar pão') === 'comprar pão');
check('"nova tarefa ligar amanhã" cria', pedidoDeCriacao('nova tarefa ligar amanhã') === 'ligar amanhã');
check('"Nova Tarefa: ligar" cria', pedidoDeCriacao('Nova Tarefa: ligar') === 'ligar');
check('"criar relatório !alta" cria', pedidoDeCriacao('criar relatório !alta') === 'relatório !alta');
check('"tarefa: revisar" cria', pedidoDeCriacao('tarefa: revisar') === 'revisar');
check('mantém maiúsculas e acentos do título', pedidoDeCriacao('+ Revisar Orçamento') === 'Revisar Orçamento');
check('"reunião amanhã" é busca, não criação', pedidoDeCriacao('reunião amanhã') === null);
check('"criatividade" não é "criar"', pedidoDeCriacao('criatividade') === null);
check('"tarefas atrasadas" não é "tarefa:"', pedidoDeCriacao('tarefas atrasadas') === null);
check('"+" sozinho não cria tarefa vazia', pedidoDeCriacao('+') === null);
check('"nova tarefa" sem título não cria', pedidoDeCriacao('nova tarefa') === null);
check('vazio não cria', pedidoDeCriacao('') === null);

// --- Filtro -------------------------------------------------------------------
const titulos = (lista: { titulo: string }[]) => lista.map(c => c.titulo);
check('sem termo, lista tudo para quem tem conta',
  filtrarComandos('', { visitante: false }).length === COMANDOS.length);
check('visitante não vê Relatórios', !titulos(filtrarComandos('', { visitante: true })).includes('Relatórios'));
check('visitante vê Minhas Tarefas', titulos(filtrarComandos('', { visitante: true })).includes('Minhas Tarefas'));
check('visitante não vê iniciar foco', !titulos(filtrarComandos('foco', { visitante: true })).some(t => t.startsWith('Iniciar foco')));
check('"pomodoro" acha o foco pelo sinônimo', titulos(filtrarComandos('pomodoro', { visitante: false }))[0] === 'Iniciar foco de 25 minutos');
check('"relat" acha Relatórios', titulos(filtrarComandos('relat', { visitante: false }))[0] === 'Relatórios');
check('acento é opcional ("configuracoes")', titulos(filtrarComandos('configuracoes', { visitante: false })).includes('Configurações'));
check('"escuro" acha o tema', titulos(filtrarComandos('escuro', { visitante: false })).includes('Alternar tema claro/escuro'));
check('termo sem comando devolve lista vazia', filtrarComandos('xyzzy', { visitante: false }).length === 0);
check('ids de comando são únicos', new Set(COMANDOS.map(c => c.id)).size === COMANDOS.length);

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
