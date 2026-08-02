import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, UserX, CheckCircle2, FolderOpen } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Dropdown } from '@/components/common/Dropdown';
import { Badge } from '@/components/common/Badge';
import { initialsOf } from '@/contexts/UserContext';
import { teamsService } from '@/services/teamsService';
import { buildTeamReport } from '@/utils/teamReport';
import type { TeamSummary, TeamMember, TeamProjectSummary } from '@/types/team';
import type { Task } from '@/types/task';

/**
 * Relatório da equipe: como o trabalho está distribuído e onde está travando.
 *
 * A agregação fica em buildTeamReport (função pura, testada). Aqui só carrega
 * os dados e desenha — inclusive porque "atrasada" depende do fuso local de
 * quem está olhando, então o cálculo precisa acontecer no cliente.
 */
export const TeamReportView: React.FC = () => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<TeamProjectSummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    teamsService
      .listTeams()
      .then(list => {
        if (!alive) return;
        setTeams(list);
        setTeamId(prev => prev || list[0]?.id || '');
        if (list.length === 0) setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setTeams([]);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      teamsService.getMembers(teamId),
      teamsService.getProjects(teamId),
      teamsService.getTasks(teamId),
    ])
      .then(([m, p, t]) => {
        if (!alive) return;
        setMembers(m);
        setProjects(p);
        setTasks(t);
      })
      .catch(() => {
        if (!alive) return;
        setMembers([]);
        setProjects([]);
        setTasks([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [teamId]);

  const report = useMemo(
    () => buildTeamReport(tasks, members, projects),
    [tasks, members, projects],
  );

  // Sem equipe não há o que relatar — a seção simplesmente não aparece.
  if (!loading && teams.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <Users size={19} className="text-primary-vibrant" />
            Relatório da equipe
          </h3>
          <p className="mt-0.5 text-sm text-text-secondary">
            Como o trabalho está distribuído e onde está travando.
          </p>
        </div>
        {teams.length > 1 && (
          <div className="sm:w-56">
            <Dropdown
              size="sm"
              value={teamId}
              onChange={setTeamId}
              options={teams.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Escolha a equipe"
            />
          </div>
        )}
      </div>

      {loading ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          Carregando o relatório…
        </Card>
      ) : report.total === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <FolderOpen size={26} className="text-text-soft" />
          <p className="text-sm text-text-secondary">
            Esta equipe ainda não tem tarefas. Crie tarefas nos projetos dela para ver o relatório.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="py-4 text-center">
              <p className="text-3xl font-bold text-text-primary">{report.total}</p>
              <p className="text-sm text-text-secondary">Tarefas da equipe</p>
            </Card>
            <Card className="py-4 text-center">
              <p className="text-3xl font-bold text-green-500">{report.completionRate}%</p>
              <p className="text-sm text-text-secondary">
                Concluídas ({report.completed}/{report.total})
              </p>
            </Card>
            <Card className="py-4 text-center">
              <p
                className={`text-3xl font-bold ${
                  report.overdue > 0 ? 'text-danger' : 'text-text-primary'
                }`}
              >
                {report.overdue}
              </p>
              <p className="text-sm text-text-secondary">Atrasadas</p>
            </Card>
            <Card className="py-4 text-center">
              <p
                className={`text-3xl font-bold ${
                  report.unassigned > 0 ? 'text-yellow-500' : 'text-text-primary'
                }`}
              >
                {report.unassigned}
              </p>
              <p className="text-sm text-text-secondary">Sem responsável</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Carga por pessoa */}
            <Card>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                <Users size={16} className="text-primary-vibrant" />
                Carga por pessoa
              </h4>
              <div className="flex flex-col gap-3">
                {report.members.map(m => (
                  <div key={m.userId} className="flex items-center gap-3">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-vibrant to-primary-dark text-xs font-bold text-white">
                        {initialsOf(m.name)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {m.name}
                          {m.title && (
                            <span className="ml-1.5 text-xs font-normal text-text-secondary">
                              {m.title}
                            </span>
                          )}
                        </p>
                        <span className="shrink-0 text-xs text-text-secondary">
                          {m.open} aberta{m.open === 1 ? '' : 's'}
                        </span>
                      </div>
                      {/* Barra: proporção concluída do que a pessoa recebeu. */}
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary-vibrant transition-all"
                          style={{ width: `${m.completionRate}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                        <span>
                          {m.completed}/{m.assigned} concluídas
                        </span>
                        {m.overdue > 0 && (
                          <Badge variant="danger" className="!px-1.5 !py-0 !text-[10px]">
                            {m.overdue} atrasada{m.overdue === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {report.unassigned > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    <UserX size={15} className="shrink-0" />
                    <span>
                      <strong>{report.unassigned}</strong> tarefa
                      {report.unassigned === 1 ? '' : 's'} sem responsável — ninguém está tocando
                      {report.unassigned === 1 ? '' : '-as'}.
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Progresso por projeto */}
            <Card>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                <CheckCircle2 size={16} className="text-primary-vibrant" />
                Progresso por projeto
              </h4>
              <div className="flex flex-col gap-3">
                {report.projects.map(p => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-primary">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate">{p.name}</span>
                      </p>
                      <span className="shrink-0 text-xs text-text-secondary">{p.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                      <span>
                        {p.completed}/{p.tasks} concluídas
                      </span>
                      {p.overdue > 0 && (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <AlertTriangle size={11} /> {p.overdue} atrasada
                          {p.overdue === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
