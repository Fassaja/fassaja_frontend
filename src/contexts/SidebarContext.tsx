import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * Estado recolhido/expandido da barra lateral — só no desktop.
 *
 * Vive num contexto porque TRÊS lugares precisam da mesma largura ao mesmo
 * tempo: a própria barra, a margem do conteúdo (AppLayout) e o começo da barra
 * do topo (Topbar). Passar por prop obrigaria a AppLayout a repassar para dois
 * filhos que nada têm a ver entre si, e qualquer divergência entre os três
 * valores aparece como um rasgo ou uma sobreposição na tela.
 *
 * No celular isto não se aplica: lá a barra já é uma gaveta que abre por cima
 * do conteúdo, com estado próprio dentro do componente.
 */
const STORAGE_KEY = 'fassaja_sidebar_collapsed';

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({} as SidebarContextValue);

export const useSidebar = () => useContext(SidebarContext);

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* localStorage indisponível (modo privado, cookies bloqueados) */
    return false;
  }
}

/**
 * Classes de largura, em pares que precisam bater entre si.
 *
 * Ficam aqui, e não soltas em cada componente, porque são um contrato: a
 * margem do conteúdo tem de ser exatamente a largura da barra. Mapa explícito
 * em vez de classe montada por template — o Tailwind varre o código como
 * TEXTO, então `lg:ml-${n}` nunca chegaria a existir no CSS.
 */
export const SIDEBAR_LARGURA = {
  /** Barra: largura própria. */
  aside: { aberta: 'w-64', recolhida: 'lg:w-20' },
  /** Conteúdo: margem à esquerda no desktop. */
  conteudo: { aberta: 'lg:ml-64', recolhida: 'lg:ml-20' },
  /** Barra do topo: onde ela começa no desktop. */
  topo: { aberta: 'lg:left-64', recolhida: 'lg:left-20' },
} as const;

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(readStored);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* sem persistência: a escolha vale só para esta aba */
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};
