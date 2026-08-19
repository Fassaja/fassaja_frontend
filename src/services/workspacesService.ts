import { api } from './api';

/** Uma área de trabalho: um recorte de filtros com nome. */
export interface Workspace {
  id: string;
  name: string;
  order: number;
  filterStatus: string;
  filterPriority: string;
  filterProject: string;
  filterTags: string[];
  view: string;
  scope: string;
}

/** O que define o recorte — sem o id e o nome. */
export type FiltrosDaArea = Omit<Workspace, 'id' | 'name' | 'order'>;

export const workspacesService = {
  list: () => api.get<Workspace[]>('/workspaces'),
  create: (name: string, filtros: FiltrosDaArea) =>
    api.post<Workspace>('/workspaces', { name, ...filtros }),
  rename: (id: string, name: string) => api.patch<Workspace>(`/workspaces/${id}`, { name }),
  saveFilters: (id: string, filtros: FiltrosDaArea) =>
    api.patch<Workspace>(`/workspaces/${id}`, filtros),
  remove: (id: string) => api.delete<void>(`/workspaces/${id}`),
};

/**
 * Os filtros de duas áreas (ou de uma área e da tela) são o mesmo recorte?
 *
 * É o que decide se a barra mostra "alterada" — e por isso compara campo a
 * campo, com as tags ordenadas: marcar A depois B é o mesmo recorte que marcar
 * B depois A, e tratá-los como diferentes faria a área parecer alterada sem
 * ninguém ter mudado nada.
 */
export function mesmosFiltros(a: FiltrosDaArea, b: FiltrosDaArea): boolean {
  return (
    a.filterStatus === b.filterStatus &&
    a.filterPriority === b.filterPriority &&
    a.filterProject === b.filterProject &&
    a.view === b.view &&
    a.scope === b.scope &&
    a.filterTags.length === b.filterTags.length &&
    [...a.filterTags].sort().join(',') === [...b.filterTags].sort().join(',')
  );
}
