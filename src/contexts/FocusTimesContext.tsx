import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { focusService } from '@/services/focusService';
import { useAuth } from '@/contexts/AuthContext';
import { useFocus } from '@/contexts/FocusContext';

/**
 * Minutos focados por tarefa — o tempo que aparece no cartão.
 *
 * Uma consulta para a tela inteira, e não uma por cartão: a lista tem dezenas
 * de itens e o tempo é um detalhe secundário em cada um. Recarrega quando uma
 * sessão termina, que é o único momento em que esses números mudam.
 */
const FocusTimesContext = createContext<Map<string, number>>(new Map());

export const useFocusTimes = () => useContext(FocusTimesContext);

export const FocusTimesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, isGuest } = useAuth();
  const { sessao, concluida } = useFocus();
  const [porTarefa, setPorTarefa] = useState<Map<string, number>>(new Map());

  const carregar = useCallback(() => {
    if (status !== 'authed' || isGuest) return;
    focusService
      .byTask()
      .then(l => setPorTarefa(new Map(l.map(x => [x.taskId, x.minutes]))))
      // Silencioso: sem o tempo o cartão fica como sempre foi.
      .catch(() => setPorTarefa(new Map()));
  }, [status, isGuest]);

  // Ao entrar, e a cada sessão que começa ou termina.
  useEffect(carregar, [carregar, sessao?.id, concluida?.id]);

  return (
    <FocusTimesContext.Provider value={porTarefa}>{children}</FocusTimesContext.Provider>
  );
};
