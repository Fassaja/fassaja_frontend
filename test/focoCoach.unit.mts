/**
 * Testes do que o Bob diz na aba Foco e de qual tarefa ele sugere.
 *
 * Nada aqui chama a IA — é regra. Estes testes existem para a regra continuar
 * respondendo o que a pessoa precisa ouvir, na ordem em que precisa ouvir.
 * Rodar: npm test
 */
import {
  candidatasParaFoco,
  limitarMinutos,
  rotuloDeDuracao,
  duracaoSugerida,
  falaDoBob,
  SESSOES_ATE_PAUSA_LONGA,
} from '../src/utils/focoCoach.ts';
import type { Task } from '../src/types/task.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const HOJE = '2026-08-24';
let seq = 0;
const t = (over: Partial<Task> = {}): Task =>
  ({
    id: `t${++seq}`,
    title: 'Tarefa',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-08-01T10:00:00Z',
    tags: [],
    assignees: [],
    subtasks: [],
    ...over,
  }) as Task;

// --- a fala do Bob ---
check('rodando, ele não atrapalha — só diz que está de olho',
  falaDoBob({ sessoesHoje: 1, minutosHoje: 25, rodando: true }).estado === 'investigate');

check('rodando com tarefa, o título é a tarefa',
  falaDoBob({ sessoesHoje: 0, minutosHoje: 0, rodando: true, tarefa: t({ title: 'Ler cap. 3' }) })
    .titulo === 'Ler cap. 3');

check('sem nada feito e sem tarefa, ele pergunta no que trabalhar',
  falaDoBob({ sessoesHoje: 0, minutosHoje: 0, rodando: false }).estado === 'confused');

check('com tarefa escolhida, ele convida a começar',
  falaDoBob({ sessoesHoje: 0, minutosHoje: 0, rodando: false, tarefa: t() }).estado === 'happy');

check('depois da primeira sessão, ele reconhece',
  falaDoBob({ sessoesHoje: 1, minutosHoje: 25, rodando: false }).estado === 'strong');

// O ponto: descanso vence elogio. Quem fechou o ciclo precisa parar.
{
  const f = falaDoBob({ sessoesHoje: SESSOES_ATE_PAUSA_LONGA, minutosHoje: 100, rodando: false });
  check('ao fechar o ciclo, ele manda descansar', f.estado === 'celebrate');
  check('e diz por quanto tempo', f.texto.includes('15 minutos'));
}
check('no oitavo ciclo também manda descansar',
  falaDoBob({ sessoesHoje: 8, minutosHoje: 200, rodando: false }).estado === 'celebrate');

check('singular e plural saem certos',
  falaDoBob({ sessoesHoje: 1, minutosHoje: 1, rodando: false }).titulo === '1 minuto focado hoje');

// --- quais tarefas ele sugere ---
{
  const atrasada = t({ title: 'Atrasada', dueDate: '2026-08-20' });
  const hoje = t({ title: 'Hoje', dueDate: HOJE });
  const andando = t({ title: 'Andando', status: 'in_progress' });
  const urgente = t({ title: 'Urgente', priority: 'high' });
  const solta = t({ title: 'Solta' });
  const feita = t({ title: 'Feita', status: 'completed' });

  const c = candidatasParaFoco([solta, feita, urgente, andando, hoje, atrasada], HOJE);
  check('a ordem é a que alguém usaria no papel',
    c.map(x => x.task.title).join(',') === 'Atrasada,Hoje,Andando,Urgente,Solta');
  check('tarefa concluída não é candidata', !c.some(x => x.task.title === 'Feita'));
  check('cada sugestão vem com o motivo', c[0].motivo === 'Atrasada' && c[1].motivo === 'Vence hoje');
  check('sem sinal nenhum, não inventa motivo', c[4].motivo === '');
  check('respeita o limite', candidatasParaFoco([solta, urgente, andando], HOJE, 2).length === 2);
}
{
  // Entre duas do mesmo peso, a de prazo mais próximo primeiro.
  const a = t({ title: 'Depois', priority: 'high', dueDate: '2026-09-10' });
  const b = t({ title: 'Antes', priority: 'high', dueDate: '2026-08-30' });
  check('empate desempata pelo prazo mais próximo',
    candidatasParaFoco([a, b], HOJE)[0].task.title === 'Antes');
}
check('lista vazia não quebra', candidatasParaFoco([], HOJE).length === 0);

// --- duração sugerida ---
check('sem tarefa, o clássico de 25', duracaoSugerida(null, HOJE) === 25);
check('vence hoje pede a de 25, que entrega antes',
  duracaoSugerida(t({ dueDate: HOJE }), HOJE) === 25);
check('atrasada também', duracaoSugerida(t({ status: 'overdue' }), HOJE) === 25);
check('tarefa alta sem pressa de data pede sessão longa',
  duracaoSugerida(t({ priority: 'high' }), HOJE) === 50);
check('muitos passos pedem sessão longa',
  duracaoSugerida(t({ subtasks: [1, 2, 3, 4].map(n => ({ id: `s${n}`, title: 'p', done: false })) }), HOJE) === 50);
check('a lista de passos vence a prioridade',
  duracaoSugerida(
    t({ priority: 'low', subtasks: [1, 2, 3, 4, 5].map(n => ({ id: `s${n}`, title: 'p', done: false })) }),
    HOJE,
  ) === 50);

// --- a postura do Bob acompanha o número ---
// Sessão contada e zero minuto: alguém abriu e fechou em segundos. Comemorar
// aí é o desenho contradizendo a frase ao lado dele.
{
  const f = falaDoBob({ sessoesHoje: 1, minutosHoje: 0, rodando: false });
  check('sessão sem tempo NÃO deixa o Bob forte', f.estado !== 'strong');
  check('ele fica animado, convidando a tentar de novo', f.estado === 'happy');
  check('e não anuncia "0 minutos focados"', !f.titulo.includes('0 minuto'));
}
check('quatro sessões sem tempo nenhum também não comemoram',
  falaDoBob({ sessoesHoje: 4, minutosHoje: 0, rodando: false }).estado !== 'celebrate');
check('mas quatro sessões COM tempo comemoram',
  falaDoBob({ sessoesHoje: 4, minutosHoje: 90, rodando: false }).estado === 'celebrate');
check('um minuto real já basta para ficar forte',
  falaDoBob({ sessoesHoje: 1, minutosHoje: 1, rodando: false }).estado === 'strong');

// --- tempo livre ---
check('abaixo do mínimo sobe para o mínimo', limitarMinutos(0) === 1);
check('acima do teto desce para o teto', limitarMinutos(500) === 60);
check('o teto é uma hora', limitarMinutos(61) === 60);
check('valor válido passa', limitarMinutos(60) === 60);
check('fracionário é arredondado', limitarMinutos(24.6) === 25);
check('lixo cai no padrão', limitarMinutos(Number.NaN) === 25);

check('menos de uma hora fala em minutos', rotuloDeDuracao(25) === '25 min');
check('uma hora exata fala em hora', rotuloDeDuracao(60) === '1h');
check('o maior atalho fala em minutos', rotuloDeDuracao(50) === '50 min');
check('o rótulo respeita o teto', rotuloDeDuracao(999) === '1h');

// --- a sugestão é atalho, não cerca ---
// A aba Foco pede a lista SEM limite quando a pessoa abre a busca. O corte de
// cinco não pode ser a única forma de chamar isto.
{
  const muitas = Array.from({ length: 12 }, (_, i) => t({ title: `Tarefa ${i}` }));
  check('sem limite, devolve todas as abertas',
    candidatasParaFoco(muitas, HOJE, Number.MAX_SAFE_INTEGER).length === 12);
  check('e o padrão continua cortando em cinco', candidatasParaFoco(muitas, HOJE).length === 5);

  // Mesmo sem limite, a ordem continua sendo a de urgência: quem abre a busca
  // e não digita nada vê o mais urgente primeiro.
  const mix = [t({ title: 'Solta' }), t({ title: 'Atrasada', dueDate: '2026-08-20' })];
  const todas = candidatasParaFoco(mix, HOJE, Number.MAX_SAFE_INTEGER);
  check('a ordem de urgência vale também na lista inteira', todas[0].task.title === 'Atrasada');
}

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
