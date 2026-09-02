import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeletons';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { normalizeRole } from '@/utils/teamPermissions';
import { buscar } from '@/utils/buscaGlobal';
import { SectionEmpty, SectionTitle } from '../TeamUI';
import { MemberRow } from '../MemberRow';

interface Props {
  detail: TeamDetail;
  userId: string;
}

/**
 * Pessoas: quem carrega o quê.
 *
 * Separada de "Gestão" de propósito. Esta responde a uma pergunta de LEITURA
 * que todo mundo da equipe faz — inclusive quem não administra nada: quem está
 * afogado, quem está livre, quem tem coisa atrasada. Mexer em papel e remover
 * gente é outra pergunta, e mora na outra aba.
 *
 * Antes as duas viviam no mesmo cartão, e o resultado era que um membro comum
 * via uma lista de pessoas cheia de botões que não faziam nada para ele.
 */
export const TeamPeople: React.FC<Props> = ({ detail, userId }) => {
  const navigate = useNavigate();
  const { team, members, report, loading } = detail;
  const [termo, setTermo] = useState('');

  /** Maior carga da equipe: as barras são relativas a ela, não a um teto fixo. */
  const maiorCarga = Math.max(0, ...report.members.map(m => m.open));

  const lista = useMemo(() => {
    if (!termo.trim()) return report.members;
    // Mesma busca do ⌘K: acento é opcional aqui também.
    return buscar(report.members, termo, m => ({ titulo: m.name, corpo: m.title ?? '' }), 60);
  }, [report.members, termo]);

  if (!team) return null;
  const base = `/tasks?scope=team&team=${team.id}`;

  return (
    <div className="space-y-8">
      {/* O gargalo silencioso primeiro: tarefa sem dono não aparece na carga de
          ninguém e por isso não é cobrada de ninguém. */}
      {!loading && report.unassigned > 0 && (
        <button
          type="button"
          onClick={() => navigate(`${base}&unassigned=1`)}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-left transition-colors hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
        >
          <AlertTriangle size={18} className="shrink-0 text-amber-500 dark:text-amber-400" />
          <p className="text-sm text-text-primary">
            <strong className="font-semibold">
              {report.unassigned} {report.unassigned === 1 ? 'tarefa' : 'tarefas'} sem responsável
            </strong>{' '}
            — não estão na carga de ninguém.
          </p>
        </button>
      )}

      <section>
        <SectionTitle
          action={
            members.length > 6 ? (
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft"
                />
                <input
                  value={termo}
                  onChange={e => setTermo(e.target.value)}
                  placeholder="Buscar pessoa"
                  className="h-8 w-40 rounded-lg border border-border bg-surface pl-8 pr-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-soft focus:border-primary-vibrant/60 sm:w-56"
                />
              </div>
            ) : (
              <span className="text-xs font-semibold tabular-nums text-text-secondary">
                {members.length}
              </span>
            )
          }
        >
          Carga por pessoa
        </SectionTitle>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: Math.min(team.memberCount, 6) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-1.5 w-28 sm:w-40" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <SectionEmpty>Ninguém encontrado com esse nome.</SectionEmpty>
        ) : (
          <div className="divide-y divide-border">
            {lista.map(m => (
              <MemberRow
                key={m.userId}
                membro={m}
                role={normalizeRole(members.find(x => x.userId === m.userId)?.role)}
                euMesmo={m.userId === userId}
                maiorCarga={maiorCarga}
                // A linha leva às tarefas DAQUELA pessoa nesta equipe. Era o
                // beco sem saída da tela antiga: dava para ver quem estava
                // afogado e não havia como chegar ao trabalho dele.
                onVerTarefas={
                  m.assigned > 0 ? () => navigate(`${base}&assignee=${m.userId}`) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
