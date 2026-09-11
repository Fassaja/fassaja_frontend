import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';
import { initialsOf } from '@/contexts/UserContext';
import { corDoGrupo, fimDeSemana, ScheduleRow, TeamSchedule } from '@/utils/teamSchedule';
import { memberColor } from './TeamTaskRow';

interface Props {
  schedule: TeamSchedule;
  members: TeamMember[];
  /** Abre a tarefa — o mesmo diálogo do Painel. */
  onOpen: (task: Task) => void;
}

/** Largura de um dia. Número, e não classe, porque vira `gridColumn` e `left`. */
const DIA = 28;
/**
 * A coluna dos títulos. `min()` para o celular: 220px numa tela de 400 deixaria
 * duas colunas de dias à vista — e a linha do tempo é o que a pessoa veio ver.
 */
const ROTULO = 'min(220px, 45vw)';

const esquerdaDe = (col: number) => `calc(${ROTULO} + ${col * DIA}px)`;

/**
 * A linha do tempo da equipe: uma linha por tarefa, barra do início ao prazo.
 *
 * Sem biblioteca. As de Gantt trazem CSS próprio, tema claro fixo e um modelo
 * com horas — três brigas com o design que já existe para ganhar um arrasto
 * que esta versão não quer. É um CSS grid, e a decisão que importa é que
 * SÓ A BARRA vive no DOM: não há uma célula por dia por linha. Sessenta
 * tarefas em cento e vinte dias seriam sete mil nós; assim são cento e
 * oitenta. As faixas de fim de semana e a linha de hoje são absolutas, uma por
 * coluna, pelo mesmo motivo.
 *
 * A coluna dos títulos é `sticky`: rolando para a semana que vem, o nome da
 * tarefa continua ao lado da barra dela. Sem isso, a pessoa rola, vê uma
 * barra azul no dia 30 e precisa voltar para saber de quem é.
 */
export const TeamGantt: React.FC<Props> = ({ schedule, members, onOpen }) => {
  const { days, weeks, groups, todayCol } = schedule;
  const rolagem = useRef<HTMLDivElement>(null);

  // Cai em "hoje", não em janeiro: a janela abre uma semana antes, e com um
  // plano longo a coluna de hoje ficaria fora da tela à primeira vista.
  useEffect(() => {
    const el = rolagem.current;
    if (!el || todayCol < 0) return;
    el.scrollLeft = Math.max(0, (todayCol - 3) * DIA);
  }, [todayCol, days.length]);

  const colunas = `${ROTULO} repeat(${days.length}, ${DIA}px)`;

  return (
    <div ref={rolagem} className="overflow-x-auto pb-1">
      <div className="relative min-w-max" style={{ display: 'grid', gridTemplateColumns: colunas }}>
        {/* Fim de semana e hoje, uma faixa por coluna, atrás de tudo. */}
        {days.map((d, i) =>
          fimDeSemana(d) ? (
            <div
              key={d}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 bg-bg-secondary/60"
              style={{ left: esquerdaDe(i), width: DIA }}
            />
          ) : null,
        )}
        {todayCol >= 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-primary-vibrant"
            style={{ left: `calc(${esquerdaDe(todayCol)} + ${DIA / 2}px)` }}
          />
        )}

        {/* Cabeçalho: semanas, depois dias. */}
        <div className="sticky left-0 z-20 bg-surface" />
        {weeks.map((w, i) => (
          <div
            key={i}
            style={{ gridColumn: `span ${w.span}` }}
            className="truncate border-l border-border px-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-soft"
          >
            {w.label}
          </div>
        ))}

        <div className="sticky left-0 z-20 border-b border-border bg-surface" />
        {days.map((d, i) => (
          <div
            key={d}
            className={`border-b border-border pb-1.5 text-center text-[11px] tabular-nums ${
              i === todayCol ? 'font-bold text-primary-vibrant' : 'text-text-soft'
            }`}
          >
            {i === todayCol ? 'hoje' : Number(d.slice(8, 10))}
          </div>
        ))}

        {groups.map(g => {
          const cor = corDoGrupo(g);
          return (
            <React.Fragment key={g.project?.id ?? 'sem-projeto'}>
              {/* O nome do projeto atravessa a linha inteira; o título fica
                  preso à esquerda com o resto da coluna. */}
              <div className="sticky left-0 z-20 flex items-center gap-2 bg-surface pb-1 pt-4">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                <span className="truncate text-sm font-semibold text-text-primary">
                  {g.project?.name ?? 'Sem projeto'}
                </span>
              </div>
              <div style={{ gridColumn: `span ${days.length}` }} />

              {g.rows.map(r => (
                <Linha key={r.task.id} row={r} cor={cor} members={members} onOpen={() => onOpen(r.task)} />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Listras para a tarefa que espera outra: a barra existe, mas ainda não anda. */
const LISTRAS = 'repeating-linear-gradient(135deg, rgba(0,0,0,.14) 0 6px, transparent 6px 12px)';

const Linha: React.FC<{
  row: ScheduleRow;
  cor: string;
  members: TeamMember[];
  onOpen: () => void;
}> = ({ row, cor, members, onOpen }) => {
  const { task, col, marco, abertoNoFim, cortada, bloqueadaPor } = row;
  const concluida = task.status === 'completed';
  const atrasada = task.status === 'overdue';
  const dono = (task.assignees ?? [])[0];
  const membro = dono ? members.find(m => m.userId === dono.id) : undefined;

  return (
    <>
      {/* Título, quem responde e o que a segura. */}
      <button
        type="button"
        onClick={onOpen}
        className="group sticky left-0 z-20 flex h-11 min-w-0 items-center gap-2 border-t border-border bg-surface pr-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium group-hover:text-primary-vibrant ${
              concluida ? 'text-text-soft line-through' : 'text-text-primary'
            }`}
          >
            {task.title}
          </p>
          {(bloqueadaPor || atrasada) && (
            <p
              className={`flex items-center gap-1 truncate text-[11px] ${
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
        </div>
        {dono &&
          (membro?.avatar ? (
            <img src={membro.avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: memberColor(dono.id) }}
              title={dono.name}
            >
              {initialsOf(dono.name)}
            </span>
          ))}
      </button>

      {/* A barra — ou o losango. `gridColumn` conta a partir da 2ª coluna. */}
      <div
        className="flex h-11 items-center border-t border-border"
        style={{ gridColumn: `${col.start + 2} / ${col.end + 3}` }}
      >
        {marco ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={task.title}
            className={`mx-auto h-3 w-3 rotate-45 rounded-[2px] transition-transform hover:scale-125 ${
              concluida ? 'opacity-35' : ''
            }`}
            style={{ backgroundColor: cor }}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            aria-label={task.title}
            className={`relative z-[2] h-6 w-full overflow-hidden rounded-md text-left transition-[filter] hover:brightness-110 ${
              abertoNoFim || cortada ? 'rounded-r-none border-r-2 border-dashed border-white/70' : ''
            } ${concluida ? 'opacity-35' : bloqueadaPor ? 'opacity-70' : 'opacity-90'}`}
            style={{
              backgroundColor: cor,
              backgroundImage: bloqueadaPor ? LISTRAS : undefined,
            }}
          >
            <span className="block truncate px-2 text-[11px] font-semibold leading-6 text-white">
              {task.title}
            </span>
          </button>
        )}
      </div>
    </>
  );
};
