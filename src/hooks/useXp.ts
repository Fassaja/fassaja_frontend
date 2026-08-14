import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { computeXp, xpInfo, XpInfo } from '@/utils/xp';

/**
 * XP e nível de quem está usando o app.
 *
 * Duas fontes, e a escolha importa:
 *
 * - COM CONTA: o total vem do servidor (`account.xp`), um placar vitalício.
 *   Somar as tarefas concluídas aqui fazia o nível CAIR com o tempo, porque o
 *   servidor apaga concluídas depois de 4 dias.
 * - VISITANTE: não há conta nem servidor; as tarefas vivem no navegador e não
 *   são apagadas por faxina nenhuma. Ali a soma local é a fonte correta.
 *
 * `completedCount` é sempre o das tarefas em memória — é uma contagem do
 * período visível, não um total histórico, e as telas a usam nesse sentido.
 */
export function useXp(): XpInfo {
  const { account, isGuest } = useAuth();
  const { tasks } = useTasks();

  const local = computeXp(tasks);
  if (isGuest || !account) return local;

  // `xp` pode faltar numa sessão salva antes do campo existir. Nesse caso o
  // cálculo local segue valendo até o próximo /auth/me — melhor do que zerar
  // o nível de quem só abriu o app.
  if (account.xp === undefined) return local;

  return xpInfo(account.xp, local.completedCount);
}
