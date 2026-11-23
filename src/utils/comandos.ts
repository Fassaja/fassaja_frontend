/**
 * Os comandos da paleta (Ctrl/⌘+K): o que dá para FAZER digitando, além de
 * buscar.
 *
 * Aqui fica só a parte que não depende de tela — a lista, o filtro e o
 * reconhecimento de "isto é um pedido para criar tarefa" — para os testes
 * rodarem sem navegador. Quem executa cada comando é a paleta.
 */
import { buscar, normalizar } from './buscaGlobal.ts';
import { DESTINOS_DO_G } from './atalhos.ts';

export type IdDoComando =
  | 'nova-tarefa'
  | 'iniciar-foco'
  | 'alternar-tema'
  | 'atalhos'
  | `ir:${string}`;

export interface Comando {
  id: IdDoComando;
  titulo: string;
  grupo: 'Ações' | 'Ir para';
  /** Sinônimos que também acham o comando ("pomodoro" acha o foco). */
  palavras: string;
  /** Teclas do atalho equivalente, para mostrar ao lado. */
  atalho?: string[];
  /** Só para quem tem conta (a rota ou a ação não existem para visitante). */
  somenteConta?: boolean;
  /** Para `ir:`, a rota. */
  rota?: string;
}

/** Rotas abertas a visitante (ver AppRoutes): o resto pede login. */
const ROTAS_DE_VISITANTE = new Set(['/', '/tasks']);

const EXTRAS_DO_IR: { rota: string; nome: string; palavras: string }[] = [
  { rota: '/priorities', nome: 'Prioridades', palavras: 'urgente alta' },
  { rota: '/team', nome: 'Equipe', palavras: 'time membros pessoas' },
  { rota: '/ai', nome: 'Assistente IA', palavras: 'bob inteligencia artificial documento' },
  { rota: '/settings', nome: 'Configurações', palavras: 'ajustes preferencias opcoes' },
  { rota: '/profile', nome: 'Perfil', palavras: 'conta foto nome' },
];

export const COMANDOS: Comando[] = [
  {
    id: 'nova-tarefa',
    titulo: 'Nova tarefa',
    grupo: 'Ações',
    palavras: 'criar adicionar tarefa nova',
    atalho: ['N'],
  },
  {
    id: 'iniciar-foco',
    titulo: 'Iniciar foco de 25 minutos',
    grupo: 'Ações',
    palavras: 'pomodoro timer concentrar cronometro sessao',
    somenteConta: true,
  },
  {
    id: 'alternar-tema',
    titulo: 'Alternar tema claro/escuro',
    grupo: 'Ações',
    palavras: 'modo escuro claro dark light aparencia',
  },
  {
    id: 'atalhos',
    titulo: 'Atalhos de teclado',
    grupo: 'Ações',
    palavras: 'teclas teclado ajuda',
    atalho: ['?'],
  },
  ...DESTINOS_DO_G.map(
    (d): Comando => ({
      id: `ir:${d.rota}`,
      titulo: d.nome,
      grupo: 'Ir para',
      palavras: 'ir abrir ver',
      atalho: ['G', d.tecla.toUpperCase()],
      rota: d.rota,
      somenteConta: !ROTAS_DE_VISITANTE.has(d.rota),
    }),
  ),
  ...EXTRAS_DO_IR.map(
    (d): Comando => ({
      id: `ir:${d.rota}`,
      titulo: d.nome,
      grupo: 'Ir para',
      palavras: `ir abrir ver ${d.palavras}`,
      rota: d.rota,
      somenteConta: !ROTAS_DE_VISITANTE.has(d.rota),
    }),
  ),
];

/**
 * Os comandos que combinam com o que foi digitado (todos, se nada foi), na
 * ordem de relevância. Visitante não vê o que não pode usar.
 */
export function filtrarComandos(termo: string, { visitante }: { visitante: boolean }): Comando[] {
  const disponiveis = COMANDOS.filter(c => !(visitante && c.somenteConta));
  if (!termo.trim()) return disponiveis;
  return buscar(disponiveis, termo, c => ({ titulo: c.titulo, corpo: c.palavras }), 6);
}

/**
 * "Isto é um pedido para criar tarefa?" — devolve o texto da tarefa, ou null.
 *
 * Só com um começo explícito ("+", "nova tarefa", "criar", "tarefa:"): sem
 * ele, o Enter na paleta continua sendo "abrir o primeiro resultado", e quem
 * só queria BUSCAR "reunião amanhã" não cria uma tarefa sem querer. Sem o
 * começo, criar ainda aparece como a última opção da lista.
 */
export function pedidoDeCriacao(termo: string): string | null {
  const bruto = termo.trimStart();
  if (bruto.startsWith('+')) return bruto.slice(1).trim() || null;
  const n = normalizar(bruto);
  for (const prefixo of ['nova tarefa', 'criar tarefa', 'criar', 'tarefa:']) {
    if (n.startsWith(prefixo) && (n.length === prefixo.length || /[\s:]/.test(n[prefixo.length]) || prefixo.endsWith(':'))) {
      return bruto.slice(prefixo.length).replace(/^[\s:]+/, '').trim() || null;
    }
  }
  return null;
}
