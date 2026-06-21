import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fassaja:poker-estimates';

export type PokerEstimates = Record<string, string>;

function read(): PokerEstimates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PokerEstimates) : {};
  } catch {
    return {};
  }
}

/**
 * Estimativas de Planning Poker guardadas no navegador (não vão para o back-end).
 * Chave = id da tarefa, valor = carta escolhida ('0','1','2','3','5','8','13','21','?').
 */
export function usePokerEstimates() {
  const [estimates, setEstimates] = useState<PokerEstimates>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
    } catch {
      /* storage cheio ou indisponível — ignora */
    }
  }, [estimates]);

  const setEstimate = useCallback((taskId: string, value: string) => {
    setEstimates(prev => ({ ...prev, [taskId]: value }));
  }, []);

  const clearEstimate = useCallback((taskId: string) => {
    setEstimates(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  return { estimates, setEstimate, clearEstimate };
}
