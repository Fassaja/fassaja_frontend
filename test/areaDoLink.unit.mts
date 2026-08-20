/**
 * Testes da escolha da área de trabalho ao chegar por um link.
 *
 * A regra: clicar em "Ver tarefas" de um projeto que já tem área própria abre
 * AQUELA área, com a aba marcada — não um recorte solto idêntico a ela.
 * Rodar: npm test
 */
import { areaParaOLink } from '../src/utils/areaDoLink.ts';
import type { Workspace } from '../src/services/workspacesService.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

function area(over: Partial<Workspace> & { id: string }): Workspace {
  return {
    name: over.id,
    order: 0,
    filterStatus: 'all',
    filterPriority: 'all',
    filterProject: 'all',
    filterTags: [],
    view: 'board',
    scope: 'solo',
    ...over,
  };
}

const doProjetoX = area({ id: 'a1', filterProject: 'X', scope: 'team' });
const outroProjeto = area({ id: 'a2', filterProject: 'Y', scope: 'team' });
const lista = [doProjetoX, outroProjeto];

check('acha a área daquele projeto e lado',
  areaParaOLink(lista, { filterProject: 'X', scope: 'team' })?.id === 'a1');

check('projeto sem área nenhuma não inventa uma',
  areaParaOLink(lista, { filterProject: 'Z', scope: 'team' }) === null);

check('lado diferente não conta como a mesma área',
  areaParaOLink(lista, { filterProject: 'X', scope: 'solo' }) === null);

check('lado desconhecido (projetos ainda carregando) casa só pelo projeto',
  areaParaOLink(lista, { filterProject: 'X', scope: null })?.id === 'a1');

check('lista vazia devolve null',
  areaParaOLink([], { filterProject: 'X', scope: 'team' }) === null);

// Desempate: entre duas áreas do mesmo projeto, a que representa o projeto
// INTEIRO é a esperada — a outra é um recorte de dentro dele, e cair nela
// esconderia tarefas sem explicação.
const soAtrasadas = area({ id: 'a3', filterProject: 'X', scope: 'team', filterStatus: 'overdue', order: 1 });
const soUrgentes = area({ id: 'a4', filterProject: 'X', scope: 'team', filterPriority: 'high', order: 2 });
const comTags = area({ id: 'a5', filterProject: 'X', scope: 'team', filterTags: ['t1', 't2'], order: 3 });

check('prefere a área sem restrição extra a uma filtrada por status',
  areaParaOLink([soAtrasadas, doProjetoX], { filterProject: 'X', scope: 'team' })?.id === 'a1');

check('prefere a área sem restrição extra a uma filtrada por prioridade',
  areaParaOLink([soUrgentes, doProjetoX], { filterProject: 'X', scope: 'team' })?.id === 'a1');

check('prefere a área sem restrição extra a uma filtrada por tags',
  areaParaOLink([comTags, doProjetoX], { filterProject: 'X', scope: 'team' })?.id === 'a1');

check('sem área limpa, pega a menos restritiva',
  areaParaOLink([comTags, soAtrasadas], { filterProject: 'X', scope: 'team' })?.id === 'a3');

// Empate real: mesma quantidade de restrições. Tem que ser previsível, sempre
// a mesma — a ordem da barra é a que a pessoa enxerga.
check('empate cai na ordem da barra',
  areaParaOLink([soUrgentes, soAtrasadas], { filterProject: 'X', scope: 'team' })?.id === 'a3');
check('empate não depende da ordem do array',
  areaParaOLink([soAtrasadas, soUrgentes], { filterProject: 'X', scope: 'team' })?.id === 'a3');

// "Ver todas as tarefas" da área de Equipe: pede o lado, não um projeto.
const areaDaEquipe = area({ id: 'a6', filterProject: 'all', scope: 'team' });
check('link só com lado acha a área daquele lado sem projeto fixo',
  areaParaOLink([areaDaEquipe, doProjetoX], { filterProject: 'all', scope: 'team' })?.id === 'a6');

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
