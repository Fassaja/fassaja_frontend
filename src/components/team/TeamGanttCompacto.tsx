import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';
import { initialsOf } from '@/contexts/UserContext';
import {
  corDoGrupo,
  fimDeSemana,
  marcasDe,
  rotuloDaLinha,
  ScheduleRow,
  segundasDe,
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
 * ~60 dias a faixa passa a rolar de lado, o que é a exceção — a janela comum
 * tem um mês.
 */
const DIA_MIN = 6;

/**
 * A linha do tempo no celular: título em cima, tempo embaixo, na largura toda.
 *
 * O grid do desktop numa tela de 400px vira "cinco dias e uma rolagem": a
 * coluna dos títulos come metade, e a barra da tarefa fica quase sempre fora
 * da vista. Aqui cada tarefa é um bloco — título, responsável, as DATAS
 * ESCRITAS — e abaixo uma faixa de calendário com a janela inteira, onde a
 * barra ocupa os dias dela.
 *
 * A faixa é um calendário, não um medidor: tem as semanas marcadas, o fim de
 * semana sombreado e "hoje" atravessando. A primeira versão era uma pílula
 * arredondada numa trilha arredondada, e lia como "40% concluído" — que é
 * outra pergunta.
 *
 * A mesma projeção do grid (`buildTeamSchedule`); só muda quem desenha.
 */
export const TeamGanttCompacto: React.FC<Props> = ({ schedule, members, onOpen }) => {
  const { days, weeks, groups, todayCol } = schedule;
  const total = days.length;
  const pct = (col: number) => `${(col / total) * 100}%`;
  const marcas = marcasDe(days, weeks);
  const segundas = segundasDe(weeks);
  const fins = days.map((d, i) => (fimDeSemana(d) ? i : -1)).filter(i => i >= 0);

  /** A faixa de fundo de cada linha: semanas, fins de semana e hoje. Um nó só, repetido. */
  const calendario = (
    <>
      {fins.map(i => (
        <span
          key={i}
          aria-hidden
          className="absolute inset-y-0 bg-bg-secondary"
          style={{ left: pct(i), width: pct(1) }}
        />
      ))}
      {segundas.map(c => (
        <span key={c} aria-hidden className="absolute inset-y-0 w-px bg-border" style={{ left: pct(c) }} />
      ))}
      {todayCol >= 0 && (
        <span
          aria-hidden
          className="absolute inset-y-0 z-[3] w-0.5 bg-primary-vibrant"
          style={{ left: pct(todayCol + 0.5) }}
        />
      )}
    </>
  );

  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: total * DIA_MIN }}>
        {/* Cabeçalho: as segundas com a data, e "hoje" por cima. */}
        <div className="relative h-6 border-b border-border text-[11px] text-text-soft">
          {marcas.map(m => (
            <span
              key={m.col}
              className="absolute bottom-1 whitespace-nowrap pl-1"
              style={{ left: pct(m.col) }}
            >
              {m.label}
            </span>
          ))}
          {todayCol >= 0 && (
            <span
              className="absolute bottom-1 z-[4] -translate-x-1/2 rounded bg-primary-vibrant px-1.5 py-px text-[10px] font-bold text-white"
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
                <Bloco
                  key={r.task.id}
                  row={r}
                  cor={cor}
                  members={members}
                  pct={pct}
                  calendario={calendario}
                  onOpen={() => onOpen(r.task)}
                />
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
  calendario: React.ReactNode;
  onOpen: () => void;
}> = ({ row, cor, members, pct, calendario, onOpen }) => {
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
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-secondary">
          {rotuloDaLinha(row)}
        </span>
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

      {/* A faixa de calendário, com a barra nos dias dela. */}
      <div className="relative mt-2 h-6 overflow-hidden rounded-md border border-border bg-surface">
        {calendario}
        {marco ? (
          <span
            className={`absolute top-1/2 z-[2] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${
              concluida ? 'opacity-35' : ''
            }`}
            style={{ backgroundColor: cor, left: pct(col.start + 0.5) }}
          />
        ) : (
          <span
            className={`absolute inset-y-0.5 z-[2] rounded-sm ${
              abertoNoFim || cortada ? 'rounded-r-none border-r-2 border-dashed border-white/70' : ''
            } ${concluida ? 'opacity-35' : bloqueadaPor ? 'opacity-70' : ''}`}
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
