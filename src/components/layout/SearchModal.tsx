import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckSquare,
  FolderOpen,
  CornerDownLeft,
  Lightbulb,
  CalendarDays,
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  destino: string;
}

const LIMITE_POR_GRUPO = 5;

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
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

  const grupos = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as { nome: string; itens: Achado[] }[];

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
      destino: `/tasks?task=${t.id}`,
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
      destino: `/tasks?project=${p.id}`,
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
      destino: '/ideas',
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
      destino: `/agenda?date=${e.date}`,
    }));

    return [
      { nome: 'Tarefas', itens: tarefas },
      { nome: 'Projetos', itens: projetos },
      { nome: 'Ideias', itens: ideias },
      { nome: 'Agenda', itens: eventos },
    ].filter(g => g.itens.length > 0);
  }, [query, tasks, projects, ideas, events]);

  // Lista achatada: o teclado anda por ela sem se importar com os grupos.
  const achatada = useMemo(() => grupos.flatMap(g => g.itens), [grupos]);

  // Digitar muda os resultados; sem isto a seleção ficaria apontando para a
  // posição de uma lista que não existe mais.
  useEffect(() => setAtivo(0), [query]);

  const ir = (destino: string) => {
    onClose();
    navigate(destino);
  };

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
        const alvo = achatada[ativo];
        if (alvo) {
          onClose();
          navigate(alvo.destino);
        }
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, achatada, ativo, onClose, navigate]);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-scrim/50 z-[60]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: -16 }}
              animate={{ y: 0 }}
              exit={{ y: -16, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
                  placeholder="Buscar tarefas, projetos, ideias e agenda…"
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
                {!query.trim() && (
                  <p className="text-center text-sm text-text-secondary py-8">
                    Procure por título, descrição ou local.
                    <br />
                    <span className="text-text-soft">Acento é opcional.</span>
                  </p>
                )}

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
                          onClick={() => ir(item.destino)}
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
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
