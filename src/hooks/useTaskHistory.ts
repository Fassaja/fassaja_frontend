import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export interface DiaDoHistorico {
  date: string; // 'YYYY-MM-DD'
  created: number;
  completed: number;
}

/**
 * Contagens por dia vindas do servidor.
 *
 * Existe porque a lista de tarefas NÃO serve de histórico: a faxina apaga as
 * concluídas depois de 4 dias, então o gráfico montado sobre ela mostrava as
 * semanas antigas zeradas — errado, não apenas incompleto.
 *
 * Devolve um mapa por data para o gráfico consultar direto, sem varrer a lista
 * uma vez por dia desenhado.
 */
export function useTaskHistory(from: string, to: string) {
  const [porDia, setPorDia] = useState<Map<string, DiaDoHistorico>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    api
      .get<DiaDoHistorico[]>(`/tasks/history?from=${from}&to=${to}`)
      .then(linhas => {
        if (!ativo) return;
        setPorDia(new Map(linhas.map(l => [l.date, l])));
      })
      // Silencioso: o gráfico cai para zero no período sem dado, que é o mesmo
      // que ele mostrava antes. Um erro vermelho aqui assustaria à toa.
      .catch(() => ativo && setPorDia(new Map()))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [from, to]);

  return { porDia, loading };
}
