import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type Abridor = () => void;

interface AjudaDaAreaValor {
  /** Há ajuda para a área que está na tela? */
  disponivel: boolean;
  /** Abre a ajuda da área atual. No-op quando não há nenhuma. */
  abrir: () => void;
  /** Chamado pela própria área. Devolve a função de desregistro. */
  registrar: (abridor: Abridor) => () => void;
}

const AjudaDaAreaContext = createContext<AjudaDaAreaValor | null>(null);

/**
 * Liga a ajuda de uma ÁREA ao botão que fica na barra do topo.
 *
 * O tutorial de cada área é renderizado dentro da página, e o botão que o abre
 * mora na barra superior — que é irmã da página, não mãe dela. Sem um ponto de
 * encontro, a barra não teria como saber se a tela atual tem ajuda nem como
 * abri-la, e o botão apareceria em telas onde não faz nada.
 *
 * A página se registra ao montar e se desregistra ao sair; a barra só desenha
 * o botão enquanto houver alguém registrado.
 */
export const AjudaDaAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const abridorRef = useRef<Abridor | null>(null);
  const [disponivel, setDisponivel] = useState(false);

  const registrar = useCallback((abridor: Abridor) => {
    abridorRef.current = abridor;
    setDisponivel(true);
    return () => {
      // Só limpa se ainda for ESTE abridor: no StrictMode o efeito roda duas
      // vezes, e uma limpeza cega apagaria o registro que acabou de entrar.
      if (abridorRef.current !== abridor) return;
      abridorRef.current = null;
      setDisponivel(false);
    };
  }, []);

  const abrir = useCallback(() => abridorRef.current?.(), []);

  const valor = useMemo(() => ({ disponivel, abrir, registrar }), [disponivel, abrir, registrar]);

  return <AjudaDaAreaContext.Provider value={valor}>{children}</AjudaDaAreaContext.Provider>;
};

/**
 * Fora do provider devolve um valor inerte em vez de estourar: a barra do topo
 * é usada por telas que não passam pelo AppLayout (autenticação, convite), e
 * ali simplesmente não há ajuda de área.
 */
export function useAjudaDaArea(): AjudaDaAreaValor {
  return (
    useContext(AjudaDaAreaContext) ?? {
      disponivel: false,
      abrir: () => {},
      registrar: () => () => {},
    }
  );
}
