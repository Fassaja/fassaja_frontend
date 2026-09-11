import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';
import { initialsOf } from '@/contexts/UserContext';
import {
  corDoGrupo,
  marcasDe,
  rotuloDaLinha,
  ScheduleRow,
  TeamSchedule,
} from '@/utils/teamSchedule';
import { memberColor } from './TeamTaskRow';

interface Props {
  schedule: TeamSchedule;
  members: TeamMember[];
  onOpen: (task: Task) => void;
}

/**
 * Largura mínima de um dia. Abaixo disso a barra de dois dias some; acima de
 * ~60 dias a trilha passa a rolar de lado, o que é a exceção — a janela
 * comum tem um mês.
 */
const DIA_MIN = 6;

/**
 * A linha do tempo no celular: título em cima, tempo embaixo, na largura toda.
 *
 * O grid do desktop numa tela de 400px vira "cinco dias e uma rolagem": a
 * coluna dos títulos come metade, e a barra da tarefa fica quase sempre fora
 * da vista — uma linha vazia onde deveria estar o que a aba existe para
 * mostrar. Aqui a pergunta é virada: cada tarefa é um bloco com o título, o
 * responsável e as DATAS ESCRITAS, e abaixo uma trilha de largura total onde
 * a barra fica na posição proporcional. A janela inteira cabe sem rolar; a
 * linha de "hoje" atravessa todos os blocos.
 *
 * A mesma projeção do grid (`buildTeamSchedule`); só muda quem desenha. A
 * linguagem também é a mesma — listras em quem espera, "Atrasada" em
 * vermelho, riscado em concluída — para a pessoa não reaprender no desktop.
 */
export const TeamGanttCompacto: React.FC<Props> = ({ schedule, members, onOpen }) => {
  const { days, weeks, groups, todayCol } = schedule;
  const total = days.length;
  const pct = (col: number) => `${(col / total) * 100}%`;
  const marcas = marcasDe(days, weeks);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative" style={{ minWidth: total * DIA_MIN }}>
        {/* Hoje: uma linha só, atrás dos blocos, do cabeçalho ao fim. */}
        {todayCol >= 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-primary-vibrant"
            style={{ left: pct(todayCol + 0.5) }}
          />
        )}

        {/* Cabeçalho: o começo de algumas semanas, e "hoje" por cima. */}
        <div className="relative h-5 border-b border-border text-[11px] text-text-soft">
          {/* A primeira marca não é centrada: centrada, metade dela ficava
              fora da caixa, cortada pela rolagem. */}
          {marcas.map(m => (
            <span
              key={m.col}
              className={`absolute top-0 whitespace-nowrap ${m.col === 0 ? '' : '-translate-x-1/2'}`}
              style={{ left: pct(m.col + (m.col === 0 ? 0 : 0.5)) }}
            >
              {m.label}
            </span>
          ))}
          {todayCol >= 0 && (
            <span
              className="absolute top-0 z-[2] -translate-x-1/2 rounded bg-surface px-1 font-bold text-primary-vibrant"
              style={{ left: pct(todayCol + 0.5) }}
            >
              hoje
            </span>
          )}
        </div>

        {groups.map(g => {
          const cor = corDoGrupo(g);
          return (
            <section key={g.project?.id ?? 'sem-projeto'} className="pt-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                <span className="truncate">{g.project?.name ?? 'Sem projeto'}</span>
              </h3>
              {g.rows.map(r => (
                <Bloco key={r.task.id} row={r} cor={cor} members={members} pct={pct} onOpen={() => onOpen(r.task)} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
};

const LISTRAS = 'repeating-linear-gradient(135deg, rgba(0,0,0,.14) 0 6px, transparent 6px 12px)';

const Bloco: React.FC<{
  row: ScheduleRow;
  cor: string;
  members: TeamMember[];
  pct: (col: number) => string;
  onOpen: () => void;
}> = ({ row, cor, members, pct, onOpen }) => {
  const { task, col, marco, abertoNoFim, cortada, bloqueadaPor } = row;
  const concluida = task.status === 'completed';
  const atrasada = task.status === 'overdue';
  const dono = (task.assignees ?? [])[0];
  const membro = dono ? members.find(m => m.userId === dono.id) : undefined;

  return (
    <button type="button" onClick={onOpen} className="group block w-full border-t border-border py-2.5 text-left">
      <div className="flex items-center gap-2">
        {dono &&
          (membro?.avatar ? (
            <img src={membro.avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: memberColor(dono.id) }}
            >
              {initialsOf(dono.name)}
            </span>
          ))}
        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary-vibrant ${
            concluida ? 'text-text-soft line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>
        <span className="shrink-0 text-[11px] tabular-nums text-text-secondary">{rotuloDaLinha(row)}</span>
      </div>

      {(bloqueadaPor || atrasada) && (
        <p
          className={`mt-0.5 flex items-center gap-1 truncate text-[11px] ${
            atrasada ? 'font-semibold text-danger' : 'text-text-soft'
          }`}
        >
          {atrasada ? (
            <>
              <AlertTriangle size={10} className="shrink-0" /> Atrasada
            </>
          ) : (
            <>
              <Lock size={10} className="shrink-0" /> depois de: {bloqueadaPor!.title}
            </>
          )}
        </p>
      )}

      {/* A trilha: a janela inteira, com a barra no lugar dela. */}
      <div className="relative mt-1.5 h-3 rounded-full bg-bg-secondary/70">
        {marco ? (
          <span
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${
              concluida ? 'opacity-35' : ''
            }`}
            style={{ backgroundColor: cor, left: pct(col.start + 0.5) }}
          />
        ) : (
          <span
            className={`absolute inset-y-0 z-[2] rounded-full ${
              abertoNoFim || cortada ? 'rounded-r-none' : ''
            } ${concluida ? 'opacity-35' : bloqueadaPor ? 'opacity-70' : 'opacity-90'}`}
            style={{
              backgroundColor: cor,
              backgroundImage: bloqueadaPor ? LISTRAS : undefined,
              left: pct(col.start),
              width: pct(col.end - col.start + 1),
            }}
          />
        )}
      </div>
    </button>
  );
};
