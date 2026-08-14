/**
 * Testes do diagnóstico "por que a tarefa criada não apareceu".
 * Rodar: npm run test
 */
import { whyHidden } from '../src/utils/taskVisibility.ts';

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

const tarefa = (over: Record<string, unknown> = {}) =>
  ({
    id: 't1',
    title: 'Comprar café',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    tags: [],
    ...over,
  }) as never;

/** Filtros "tudo aberto", no lado pessoal. */
const limpo = {
  scope: 'solo' as const,
  taskScope: 'solo' as const,
  searchTerm: '',
  filterStatus: 'all',
  filterPriority: 'all',
  filterProject: 'all',
  filterTags: [] as string[],
};

// --- Caminho feliz -----------------------------------------------------
check('sem filtro nenhum, aparece', whyHidden(tarefa(), limpo) === null);

// --- O bug relatado ----------------------------------------------------
// Lado "Equipe" aberto (fica salvo no localStorage) + tarefa nova sem projeto,
// que é pessoal. Era exatamente isto: "criada com sucesso" e nada na tela.
const escopoErrado = whyHidden(tarefa(), { ...limpo, scope: 'team', taskScope: 'solo' });
check('escopo errado esconde', escopoErrado !== null);
check('e aponta para qual lado ir', escopoErrado?.scope === 'solo');
check('sem culpar os filtros de sessão', escopoErrado?.filters === false);

// O inverso também: tarefa de equipe criada com o lado pessoal aberto.
const inverso = whyHidden(tarefa({ projectId: 'p1' }), {
  ...limpo,
  scope: 'solo',
  taskScope: 'team',
});
check('escopo errado ao contrário', inverso?.scope === 'team');

// --- Filtros de sessão -------------------------------------------------
check(
  'busca que não casa esconde',
  whyHidden(tarefa(), { ...limpo, searchTerm: 'relatório' })?.filters === true,
);
check(
  'busca que casa não esconde',
  whyHidden(tarefa(), { ...limpo, searchTerm: 'café' }) === null,
);
check(
  'busca só com espaços é ignorada',
  whyHidden(tarefa(), { ...limpo, searchTerm: '   ' }) === null,
);
check(
  'busca não diferencia maiúsculas',
  whyHidden(tarefa(), { ...limpo, searchTerm: 'CAFÉ' }) === null,
);
check(
  'status diferente esconde',
  whyHidden(tarefa(), { ...limpo, filterStatus: 'completed' })?.filters === true,
);
check(
  'status igual não esconde',
  whyHidden(tarefa(), { ...limpo, filterStatus: 'pending' }) === null,
);
check(
  'prioridade diferente esconde',
  whyHidden(tarefa(), { ...limpo, filterPriority: 'high' })?.filters === true,
);
check(
  'projeto diferente esconde',
  whyHidden(tarefa({ projectId: 'a' }), { ...limpo, filterProject: 'b' })?.filters === true,
);
// Tarefa nova nasce sem tag: qualquer tag marcada a esconde.
check(
  'filtro de tag esconde tarefa sem tag',
  whyHidden(tarefa(), { ...limpo, filterTags: ['tag1'] })?.filters === true,
);
check(
  'tag marcada que a tarefa tem não esconde',
  whyHidden(tarefa({ tags: [{ id: 'tag1', name: 'x', color: '#fff' }] }), {
    ...limpo,
    filterTags: ['tag1'],
  }) === null,
);

// --- Combinação --------------------------------------------------------
const ambos = whyHidden(tarefa(), {
  ...limpo,
  scope: 'team',
  taskScope: 'solo',
  filterStatus: 'completed',
});
check('escopo e filtro juntos: reporta os dois', ambos?.scope === 'solo' && ambos?.filters === true);

// Escopo certo, mas filtro atrapalhando: não pede troca de lado à toa.
const soFiltro = whyHidden(tarefa(), { ...limpo, filterPriority: 'high' });
check('só filtro: não manda trocar de escopo', soFiltro?.scope === undefined);
check('só filtro: marca filters', soFiltro?.filters === true);

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
