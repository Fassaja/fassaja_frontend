import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiltrosDaArea,
  Workspace,
  mesmosFiltros,
  workspacesService,
} from '@/services/workspacesService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { TODOS_PROJETOS } from '@/utils/taskFilters';
import { Project } from '@/types/project';
import { Tag } from '@/types/tag';

const LIMITE = 12;
/** Qual área estava aberta. Só o ID: o conteúdo vem do servidor. */
const CHAVE_ATIVA = 'fassaja_area_ativa';

interface Params {
  filtrosAtuais: FiltrosDaArea;
  aplicarFiltros: (f: FiltrosDaArea) => void;
  projects: Project[];
  tags: Tag[];
}

/**
 * Áreas de trabalho: carregar, trocar, salvar.
 *
 * As áreas vivem no servidor (acompanham a pessoa entre navegadores), mas
 * QUAL estava aberta fica no navegador: é preferência daquela tela, daquele
 * aparelho. Guardá-la no servidor faria abrir o celular no recorte que ficou
 * aberto no computador — quase sempre não é o que se quer.
 */
export function useWorkspaces({ filtrosAtuais, aplicarFiltros, projects, tags }: Params) {
  const { status } = useAuth();
  const toast = useToast();
  const [lista, setLista] = useState<Workspace[]>([]);
  const [ativaId, setAtivaId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authed') return;
    workspacesService
      .list()
      .then(setLista)
      // Silencioso: sem áreas a tela funciona igual, com os filtros soltos.
      .catch(() => setLista([]));
  }, [status]);

  const ativa = useMemo(() => lista.find(a => a.id === ativaId) ?? null, [lista, ativaId]);

  /**
   * Restaura a área aberta na última visita, uma vez, quando a lista chega.
   *
   * Depende de `lista` e não roda em toda mudança dela: sem a guarda do
   * `ativaId`, salvar uma área recarregaria a lista e reaplicaria os filtros
   * por cima do que a pessoa acabou de mexer.
   */
  useEffect(() => {
    if (ativaId !== null || lista.length === 0) return;
    let salva: string | null = null;
    try {
      salva = localStorage.getItem(CHAVE_ATIVA);
    } catch {
      /* localStorage indisponível */
    }
    const alvo = lista.find(a => a.id === salva);
    if (alvo) {
      setAtivaId(alvo.id);
      aplicarFiltros(comReferenciasValidas(alvo, projects, tags));
    }
    // Só na chegada da lista: incluir `aplicarFiltros` reaplicaria a área a
    // cada render em que ela mudasse de identidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  const alterada = useMemo(
    () => (ativa ? !mesmosFiltros(filtrosAtuais, ativa) : false),
    [ativa, filtrosAtuais],
  );

  const lembrar = (id: string | null) => {
    try {
      if (id) localStorage.setItem(CHAVE_ATIVA, id);
      else localStorage.removeItem(CHAVE_ATIVA);
    } catch {
      /* sem persistência: vale só para esta visita */
    }
  };

  const selecionar = useCallback(
    (id: string | null) => {
      setAtivaId(id);
      lembrar(id);
      if (!id) {
        // "Início" volta ao estado de fábrica da tela.
        aplicarFiltros({
          filterStatus: 'all',
          filterPriority: 'all',
          filterProject: 'none',
          filterTags: [],
          view: 'board',
          scope: 'solo',
        });
        return;
      }
      const alvo = lista.find(a => a.id === id);
      if (alvo) aplicarFiltros(comReferenciasValidas(alvo, projects, tags));
    },
    [lista, aplicarFiltros, projects, tags],
  );

  const criar = useCallback(
    async (nome: string) => {
      try {
        const nova = await workspacesService.create(nome, filtrosAtuais);
        setLista(prev => [...prev, nova]);
        setAtivaId(nova.id);
        lembrar(nova.id);
        toast.success(`Área "${nova.name}" criada com os filtros atuais.`);
      } catch (err) {
        toast.error((err as Error).message || 'Não foi possível criar a área.');
      }
    },
    [filtrosAtuais, toast],
  );

  const renomear = useCallback(
    async (id: string, nome: string) => {
      try {
        const atualizada = await workspacesService.rename(id, nome);
        setLista(prev => prev.map(a => (a.id === id ? atualizada : a)));
      } catch {
        toast.error('Não foi possível renomear a área.');
      }
    },
    [toast],
  );

  const salvarFiltros = useCallback(
    async (id: string) => {
      try {
        const atualizada = await workspacesService.saveFilters(id, filtrosAtuais);
        setLista(prev => prev.map(a => (a.id === id ? atualizada : a)));
        toast.success('Filtros salvos nesta área.');
      } catch {
        toast.error('Não foi possível salvar os filtros.');
      }
    },
    [filtrosAtuais, toast],
  );

  /** Volta a tela ao que a área guarda, jogando fora as mudanças da sessão. */
  const descartar = useCallback(() => {
    if (ativa) aplicarFiltros(comReferenciasValidas(ativa, projects, tags));
  }, [ativa, aplicarFiltros, projects, tags]);

  const excluir = useCallback(
    async (id: string) => {
      try {
        await workspacesService.remove(id);
        setLista(prev => prev.filter(a => a.id !== id));
        if (ativaId === id) {
          setAtivaId(null);
          lembrar(null);
        }
      } catch {
        toast.error('Não foi possível excluir a área.');
      }
    },
    [ativaId, toast],
  );

  return { lista, ativaId, alterada, selecionar, criar, renomear, salvarFiltros, descartar, excluir, limite: LIMITE };
}

/**
 * Troca por "todos" o que a área aponta e não existe mais.
 *
 * Um projeto ou uma tag apagados deixariam a área filtrando por um id órfão —
 * a tela abriria vazia, sem nada na barra explicando o motivo, e a pessoa
 * concluiria que perdeu as tarefas. Cair para "todos" mostra o que existe.
 */
function comReferenciasValidas(a: Workspace, projects: Project[], tags: Tag[]): FiltrosDaArea {
  const projetoExiste =
    a.filterProject === TODOS_PROJETOS ||
    a.filterProject === 'none' ||
    projects.some(p => p.id === a.filterProject);
  const idsDeTag = new Set(tags.map(t => t.id));
  return {
    filterStatus: a.filterStatus,
    filterPriority: a.filterPriority,
    filterProject: projetoExiste ? a.filterProject : TODOS_PROJETOS,
    filterTags: a.filterTags.filter(id => idsDeTag.has(id)),
    view: a.view,
    scope: a.scope,
  };
}
