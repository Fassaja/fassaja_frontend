import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckSquare,
  FolderOpen,
  CornerDownLeft,
  Lightbulb,
  CalendarDays,
  Plus,
  Timer,
  SunMoon,
  Keyboard,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Idea } from '@/types/idea';
import { CalendarEvent } from '@/types/event';
import { tasksService } from '@/services/tasksService';
import { projectsService } from '@/services/projectsService';
import { ideasService } from '@/services/ideasService';
import { eventsService } from '@/services/eventsService';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Kbd } from '@/components/common/Kbd';
import { useAuth } from '@/contexts/AuthContext';
import { buscar, trecho } from '@/utils/buscaGlobal';
import { tint, chipText } from '@/utils/color';
import { formatDateChip } from '@/utils/date';
import { transicao } from '@/components/motion/tokens';
import { useTasks } from '@/contexts/TasksContext';
import { useTags } from '@/contexts/TagsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFocus } from '@/contexts/FocusContext';
import { useToast } from '@/contexts/ToastContext';
import { interpretar } from '@/utils/quickParse';
import { type Comando, filtrarComandos, pedidoDeCriacao } from '@/utils/comandos';
import { ABRIR_ATALHOS_EVENT } from '@/utils/atalhos';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** "Nova tarefa" da página atual (a barra do topo sabe qual é). */
  onNovaTarefa: () => void;
}

const ROTULO_PRIORIDADE = { high: 'Prioridade alta', medium: 'Prioridade média', low: 'Prioridade baixa' };

/** Uma linha da lista, já pronta para desenhar e para navegar. */
interface Achado {
  chave: string;
  grupo: string;
  titulo: string;
  /** Por que este item apareceu, quando não foi pelo título. */
  trecho: string | null;
  /** Contexto curto à direita (data do evento, estágio da ideia). */
  etiqueta?: string;
  icone: React.ReactNode;
  /** O que acontece no Enter ou no clique. */
  executar: () => void;
  /** Teclas do atalho equivalente, mostradas à direita. */
  atalho?: string[];
}

const LIMITE_POR_GRUPO = 5;

/**
 * Busca E paleta de comandos (Ctrl/⌘+K, ou `/`).
 *
 * Aberta vazia, mostra o que dá para fazer e para onde ir. Digitando, mistura
 * os comandos que combinam com os resultados da busca. Começando com "+" (ou
 * "nova tarefa", "criar"), a linha vira uma tarefa: o mesmo intérprete do
 * formulário entende "amanhã", "sexta", "!alta" e "#tag", e o Enter cria
 * direto, sem abrir formulário nenhum.
 */
export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNovaTarefa }) => {
  const navigate = useNavigate();
  const { isGuest, guestTaskCount, guestTaskLimit, requireAuth } = useAuth();
  const { createTask } = useTasks();
  const { tags } = useTags();
  const { resolved, setPreference } = useTheme();
  const { iniciar } = useFocus();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ativo, setAtivo] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setAtivo(0);
    // Cada busca é silenciosa em caso de falha: uma fonte fora do ar deixa a
    // busca mais pobre, mas continuar buscando nas outras é melhor do que
    // derrubar a caixa inteira.
    tasksService.getTasks().then(setTasks).catch(() => setTasks([]));
    projectsService.getProjects().then(setProjects).catch(() => setProjects([]));
    // Convidado não tem ideias nem agenda: pedir daria 401 nas duas, e são
    // dois requests condenados a cada vez que a busca abre.
    if (!isGuest) {
      ideasService.list().then(setIdeas).catch(() => setIdeas([]));
      // Sem intervalo: a busca olha a agenda inteira, não só a semana aberta.
      eventsService.list().then(setEvents).catch(() => setEvents([]));
    }
  }, [isOpen, isGuest]);

  const ir = (destino: string) => {
    onClose();
    navigate(destino);
  };

  const executarComando = (c: Comando) => {
    onClose();
    switch (c.id) {
      case 'nova-tarefa':
        onNovaTarefa();
        break;
      case 'iniciar-foco':
        navigate('/focus');
        void iniciar(25);
        break;
      case 'alternar-tema':
        setPreference(resolved === 'dark' ? 'light' : 'dark');
        break;
      case 'atalhos':
        window.dispatchEvent(new Event(ABRIR_ATALHOS_EVENT));
        break;
      default:
        if (c.rota) navigate(c.rota);
    }
  };

  const iconeDoComando = (c: Comando) => {
    const classe = 'text-text-secondary shrink-0';
    if (c.id === 'nova-tarefa') return <Plus size={18} className={classe} />;
    if (c.id === 'iniciar-foco') return <Timer size={18} className={classe} />;
    if (c.id === 'alternar-tema') return <SunMoon size={18} className={classe} />;
    if (c.id === 'atalhos') return <Keyboard size={18} className={classe} />;
    return <ArrowRight size={18} className={classe} />;
  };

  const paraAchado = (c: Comando): Achado => ({
    chave: c.id,
    grupo: c.grupo,
    titulo: c.grupo === 'Ir para' ? `Ir para ${c.titulo}` : c.titulo,
    trecho: null,
    icone: iconeDoComando(c),
    executar: () => executarComando(c),
    atalho: c.atalho,
  });

  /** Cria a tarefa direto da paleta, com o que o intérprete entendeu. */
  const criarTarefa = async (texto: string) => {
    if (isGuest && guestTaskCount >= guestTaskLimit) {
      onClose();
      requireAuth(`Visitantes podem criar até ${guestTaskLimit} tarefas por dia. Entre para criar mais.`);
      return;
    }
    const lido = interpretar(texto, new Date(), { tagsConhecidas: tags.map(t => t.name) });
    if (!lido.title.trim()) return;
    onClose();
    try {
      const tagIds = lido.tags
        .map(nome => tags.find(t => t.name === nome)?.id)
        .filter((id): id is string => !!id);
      const nova = await createTask({
        title: lido.title,
        priority: lido.priority ?? 'medium',
        status: 'pending',
        dueDate: lido.dueDate,
        tagIds: tagIds.length ? tagIds : undefined,
      });
      toast.comAcao('Tarefa criada.', {
        rotulo: 'Abrir',
        onClick: () => navigate(`/tasks?task=${nova.id}`),
      });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível criar a tarefa. Tente novamente.');
    }
  };

  const grupos = useMemo(() => {
    const q = query.trim();
    const comandos = filtrarComandos(q, { visitante: isGuest }).map(paraAchado);

    // Aberta vazia: o que dá para fazer, e para onde ir.
    if (!q) {
      return [
        { nome: 'Ações', itens: comandos.filter(c => c.grupo === 'Ações') },
        { nome: 'Ir para', itens: comandos.filter(c => c.grupo === 'Ir para') },
      ];
    }

    // A linha como tarefa. Com "+"/"nova tarefa" no começo ela é a primeira
    // (e única) opção; sem, fica por último — o Enter continua abrindo o
    // primeiro resultado da busca, como antes.
    const pedido = pedidoDeCriacao(q);
    const textoDaTarefa = pedido ?? q;
    const lido = interpretar(textoDaTarefa, new Date(), { tagsConhecidas: tags.map(t => t.name) });
    const detalhes = [
      lido.dueDate && `Prazo ${formatDateChip(lido.dueDate)}`,
      lido.priority && ROTULO_PRIORIDADE[lido.priority],
      ...lido.tags.map(t => `#${t}`),
    ].filter(Boolean);
    const criar: Achado[] = lido.title.trim()
      ? [
          {
            chave: 'criar-tarefa',
            grupo: 'Criar',
            titulo: `Criar tarefa “${lido.title}”`,
            trecho: detalhes.length
              ? detalhes.join(' · ')
              : 'Dá para escrever o prazo e a prioridade: “amanhã”, “sexta”, “!alta”, “#tag”.',
            icone: <Plus size={18} className="text-primary-vibrant shrink-0" />,
            executar: () => void criarTarefa(textoDaTarefa),
          },
        ]
      : [];
    if (pedido !== null) return [{ nome: 'Criar', itens: criar }];

    const tarefas: Achado[] = buscar(
      tasks,
      q,
      t => ({ titulo: t.title, corpo: t.description }),
      LIMITE_POR_GRUPO,
    ).map(t => ({
      chave: `task-${t.id}`,
      grupo: 'Tarefas',
      titulo: t.title,
      trecho: trecho(t.description, q),
      icone: <CheckSquare size={18} className="text-primary-vibrant shrink-0" />,
      // Abre a tarefa em si; o resto da tela se ajusta sozinho.
      executar: () => ir(`/tasks?task=${t.id}`),
    }));

    const projetos: Achado[] = buscar(
      projects,
      q,
      p => ({ titulo: p.name, corpo: p.description }),
      LIMITE_POR_GRUPO,
    ).map(p => ({
      chave: `project-${p.id}`,
      grupo: 'Projetos',
      titulo: p.name,
      trecho: trecho(p.description, q),
      icone: (
        <span
          className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: tint(p.color, 'medium'), color: chipText(p.color) }}
        >
          <FolderOpen size={13} />
        </span>
      ),
      // As tarefas do projeto, já no lado certo — quem procura um projeto
      // quer o trabalho dele, não o cartão dele numa grade.
      executar: () => ir(`/tasks?project=${p.id}`),
    }));

    const ideias: Achado[] = buscar(
      ideas,
      q,
      i => ({ titulo: i.title, corpo: i.description }),
      LIMITE_POR_GRUPO,
    ).map(i => ({
      chave: `idea-${i.id}`,
      grupo: 'Ideias',
      titulo: i.title,
      trecho: trecho(i.description, q),
      etiqueta: i.status,
      icone: <Lightbulb size={18} className="text-amber-500 shrink-0" />,
      executar: () => ir('/ideas'),
    }));

    const eventos: Achado[] = buscar(
      events,
      q,
      // O local entra na busca junto da descrição: "onde era aquilo?" é uma
      // das perguntas que mais levam alguém a procurar um evento.
      e => ({ titulo: e.title, corpo: [e.description, e.location].filter(Boolean).join(' — ') }),
      LIMITE_POR_GRUPO,
    ).map(e => ({
      chave: `event-${e.id}`,
      grupo: 'Agenda',
      titulo: e.title,
      trecho: trecho([e.description, e.location].filter(Boolean).join(' — '), q),
      etiqueta: formatDateChip(e.date),
      icone: <CalendarDays size={18} className="text-emerald-500 shrink-0" />,
      executar: () => ir(`/agenda?date=${e.date}`),
    }));

    return [
      { nome: 'Comandos', itens: comandos },
      { nome: 'Tarefas', itens: tarefas },
      { nome: 'Projetos', itens: projetos },
      { nome: 'Ideias', itens: ideias },
      { nome: 'Agenda', itens: eventos },
      { nome: 'Criar', itens: criar },
    ].filter(g => g.itens.length > 0);
    // As funções de executar mudam a cada render, mas só leem estado atual
    // quando chamadas; recalcular a lista por causa delas não muda nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tasks, projects, ideas, events, tags, isGuest]);

  // Lista achatada: o teclado anda por ela sem se importar com os grupos.
  const achatada = useMemo(() => grupos.flatMap(g => g.itens), [grupos]);

  // Digitar muda os resultados; sem isto a seleção ficaria apontando para a
  // posição de uma lista que não existe mais.
  useEffect(() => setAtivo(0), [query]);

  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (achatada.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault(); // senão o cursor pula para o fim do campo
        setAtivo(i => (i + 1) % achatada.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAtivo(i => (i - 1 + achatada.length) % achatada.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        achatada[ativo]?.executar();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, achatada, ativo, onClose]);

  // Mantém o selecionado à vista ao andar com as setas por uma lista rolável.
  useEffect(() => {
    listaRef.current
      ?.querySelector('[data-ativo="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [ativo]);

  let indice = -1;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* O fosco fica no PAINEL, nunca aqui. Desfocar o fundo inteiro é
              repintar a tela toda a cada quadro — caro, e some com o texto
              que estava atrás. Um véu mais leve que o normal (50%) de
              propósito: se o fundo some, não há o que o painel translúcido
              deixe transparecer, e o fosco vira só um cinza. */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: transicao.saida }}
            transition={transicao.media}
            onClick={onClose}
            className="fixed inset-0 bg-scrim/50 z-[60]"
          />
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: transicao.saida }}
            transition={transicao.media}
            className="fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
            onClick={onClose}
          >
            <m.div
              initial={{ y: -16 }}
              animate={{ y: 0 }}
              exit={{ y: -16, transition: transicao.saida }}
              transition={transicao.media}
              // Diálogo de verdade para o leitor de tela — e para os atalhos
              // de uma tecla saberem que há uma janela aberta por cima.
              role="dialog"
              aria-modal="true"
              aria-label="Buscar e comandos"
              /* Fosco: translúcido + desfoque do que passa por baixo. A borda
                 fica fina e discreta — no vidro é a sombra que separa o painel
                 do fundo, e uma moldura grossa o transformaria numa caixa
                 opaca com um fundo bonito atrás. */
              className="w-full max-w-xl bg-surface/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <Search size={20} className="text-text-secondary" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar ou digitar um comando…"
                  className="flex-1 bg-transparent text-text-primary placeholder-text-soft focus:outline-none"
                />
                {/* Esc, e não o próprio atalho: aqui dentro a pessoa já
                    entrou — o que ela ainda não sabe é como sair.

                    A visibilidade vai no invólucro: o Kbd já é `inline-grid`, e
                    mandar `hidden` junto deixaria as duas classes de display
                    disputando — quem vence depende da ordem no CSS gerado. */}
                <span className="hidden sm:block">
                  <Kbd>Esc</Kbd>
                </span>
              </div>

              <div ref={listaRef} className="max-h-[60vh] overflow-y-auto p-2">
                {query.trim() && achatada.length === 0 && (
                  <p className="text-center text-sm text-text-secondary py-8">
                    Nada encontrado para "{query}".
                  </p>
                )}

                {grupos.map(grupo => (
                  <div key={grupo.nome} className="mb-2 last:mb-0">
                    <p className="px-3 py-1.5 text-xs font-semibold text-text-soft uppercase tracking-wide">
                      {grupo.nome}
                    </p>
                    {grupo.itens.map(item => {
                      indice += 1;
                      const selecionado = indice === ativo;
                      return (
                        <button
                          key={item.chave}
                          data-ativo={selecionado}
                          onMouseEnter={() => setAtivo(achatada.findIndex(a => a.chave === item.chave))}
                          onClick={item.executar}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${
                            selecionado ? 'bg-bg-secondary' : ''
                          }`}
                        >
                          {item.icone}
                          <span className="flex-1 min-w-0">
                            <span className="block truncate text-sm text-text-primary">
                              {item.titulo}
                            </span>
                            {item.trecho && (
                              <span className="block truncate text-xs text-text-secondary">
                                {item.trecho}
                              </span>
                            )}
                          </span>
                          {item.atalho && (
                            <span className="hidden shrink-0 items-center gap-1 sm:flex">
                              {item.atalho.map(t => (
                                <Kbd key={t}>{t}</Kbd>
                              ))}
                            </span>
                          )}
                          {item.etiqueta && (
                            <span className="shrink-0 text-[11px] text-text-soft capitalize">
                              {item.etiqueta}
                            </span>
                          )}
                          <CornerDownLeft
                            size={15}
                            className={`shrink-0 text-text-soft ${selecionado ? '' : 'opacity-0'}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                ))}

                {!query.trim() && (
                  <p className="px-3 pb-1 pt-3 text-xs text-text-soft">
                    Comece com <Kbd>+</Kbd> para criar uma tarefa: “+ revisar proposta sexta
                    !alta”.
                  </p>
                )}
              </div>
            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
