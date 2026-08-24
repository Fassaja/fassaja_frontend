import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Square, Check, Coffee } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useFocus } from '@/contexts/FocusContext';
import { focusService } from '@/services/focusService';
import { useAuth } from '@/contexts/AuthContext';
import { formatarRelogio, progressoDaSessao } from '@/utils/timer';
import { candidatasParaFoco, duracaoSugerida, falaDoBob } from '@/utils/focoCoach';
import { SeletorDeTempo } from '@/components/focus/SeletorDeTempo';
import { todayISO } from '@/utils/date';
import { tint } from '@/utils/color';

/** Curva usada no app inteiro. Repetida aqui para o ritmo ser o mesmo. */
const SUAVE = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

/**
 * A aba Foco.
 *
 * Uma pergunta por vez, na ordem em que ela aparece na cabeça de quem senta
 * para trabalhar: **no que** vou trabalhar, **por quanto tempo**, e — enquanto
 * corre — **quanto falta**. Nada mais entra na tela; escolher o que fazer é o
 * momento em que qualquer coisa a mais atrapalha.
 *
 * Tudo sai do que o app já tem: as tarefas são as suas, com o prazo e a
 * prioridade que você já definiu, e o Bob decide o que dizer por regra — sem
 * chamar a IA e sem gastar a cota semanal (ver utils/focoCoach.ts).
 */
const FocusPage: React.FC = () => {
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { account, isGuest } = useAuth();
  const { sessao, restante, iniciar, iniciando, encerrar } = useFocus();

  const hoje = todayISO();
  const [tarefaId, setTarefaId] = useState<string | null>(null);
  const [hojeStats, setHojeStats] = useState({ minutes: 0, sessions: 0 });

  const candidatas = useMemo(() => candidatasParaFoco(tasks, hoje), [tasks, hoje]);
  const tarefa = useMemo(
    () => tasks.find(t => t.id === (sessao?.taskId ?? tarefaId)) ?? null,
    [tasks, sessao?.taskId, tarefaId],
  );

  // Recarrega ao terminar uma sessão: é quando o número do dia muda.
  useEffect(() => {
    if (isGuest || !account) return;
    let vivo = true;
    focusService
      .history(hoje, hoje)
      .then(l => vivo && setHojeStats({ minutes: l[0]?.minutes ?? 0, sessions: l[0]?.sessions ?? 0 }))
      .catch(() => vivo && setHojeStats({ minutes: 0, sessions: 0 }));
    return () => {
      vivo = false;
    };
  }, [hoje, sessao?.id, isGuest, account]);

  const bob = falaDoBob({
    sessoesHoje: hojeStats.sessions,
    minutosHoje: hojeStats.minutes,
    rodando: !!sessao,
    tarefa,
  });
  const sugerida = duracaoSugerida(tarefa, hoje);
  const projeto = projects.find(p => p.id === tarefa?.projectId);

  return (
    <AppLayout title="Foco" subtitle="Uma tarefa, um tempo, sem o resto do mundo.">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        {/* O Bob e o que ele tem a dizer. Troca com o estado, sem saltar. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={bob.titulo}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SUAVE}
            className="flex flex-col items-center gap-2 text-center"
          >
            <Mascot state={bob.estado} size={sessao ? 'sm' : 'lg'} animate />
            <div>
              <h2 className="text-lg font-bold text-text-primary">{bob.titulo}</h2>
              <p className="text-sm text-text-secondary">{bob.texto}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* O relógio, quando há sessão. */}
        <AnimatePresence mode="wait">
          {sessao ? (
            <motion.div
              key="rodando"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={SUAVE}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                /* Respiração lenta enquanto a sessão corre: dá sinal de vida
                   sem competir com o número. Quatro segundos por ciclo — mais
                   rápido que isso vira ansiedade, que é o oposto do recurso. */
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative grid h-56 w-56 place-items-center"
              >
                <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-border" />
                  <circle
                    cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeLinecap="round"
                    className="stroke-primary-vibrant"
                    strokeDasharray={2 * Math.PI * 54}
                    /* O traço vem do RELÓGIO, como o número. Um anel animado
                       por conta própria descolaria do tempo real assim que a
                       aba fosse para o fundo. */
                    strokeDashoffset={
                      2 * Math.PI * 54 * (1 - progressoDaSessao(sessao.startedAt, sessao.endsAt) / 100)
                    }
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-bold tabular-nums text-text-primary">
                    {formatarRelogio(restante)}
                  </span>
                  {sessao.kind === 'pausa' && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <Coffee size={13} /> Pausa
                    </span>
                  )}
                </div>
              </motion.div>

              {sessao.taskTitle && (
                <p className="max-w-sm truncate text-sm text-text-secondary">
                  {sessao.taskTitle}
                </p>
              )}

              <button
                type="button"
                onClick={encerrar}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-danger/50 hover:text-danger min-h-[44px]"
              >
                <Square size={15} fill="currentColor" /> Encerrar
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="parado"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SUAVE}
              className="flex w-full flex-col items-center gap-5"
            >
              {/* 1. No que — as tarefas que já existem, com o motivo à mostra. */}
              {candidatas.length > 0 && (
                <div className="w-full">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">
                    No que vamos trabalhar?
                  </p>
                  <motion.div
                    className="flex flex-col gap-1.5"
                    initial="oculto"
                    animate="visivel"
                    /* Cascata: as tarefas entram em sequência, guiando o olho
                       de cima para baixo — a mesma ordem em que a lista deve
                       ser lida. Um bloco inteiro aparecendo de uma vez não diz
                       por onde começar. */
                    variants={{ visivel: { transition: { staggerChildren: 0.045 } } }}
                  >
                    {candidatas.map(({ task, motivo }) => {
                      const escolhida = tarefaId === task.id;
                      const cor = projects.find(p => p.id === task.projectId)?.color;
                      return (
                        <motion.button
                          key={task.id}
                          type="button"
                          layout
                          variants={{
                            oculto: { opacity: 0, y: 10 },
                            visivel: { opacity: 1, y: 0 },
                          }}
                          transition={SUAVE}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setTarefaId(escolhida ? null : task.id)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            escolhida
                              ? 'border-primary-vibrant bg-primary-light/40'
                              : 'border-border bg-surface hover:border-primary-vibrant/40'
                          }`}
                        >
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cor ?? 'var(--color-border)' }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                            {task.title}
                          </span>
                          {motivo && (
                            <span className="shrink-0 text-[11px] font-semibold text-text-soft">
                              {motivo}
                            </span>
                          )}
                          {escolhida && <Check size={15} className="shrink-0 text-primary-vibrant" />}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}

              {/* 2. Por quanto tempo — atalhos, e tempo livre para quem quer
                  uma hora nesta tarefa. Ver components/focus/SeletorDeTempo. */}
              <SeletorDeTempo
                sugerida={sugerida}
                desabilitado={iniciando}
                onEscolher={m => iniciar(m, tarefaId ?? undefined)}
              />

              {projeto && tarefaId && (
                <p className="-mt-2 text-xs text-text-soft">
                  O tempo vai para{' '}
                  <span
                    className="rounded px-1.5 py-0.5 font-semibold"
                    style={{ backgroundColor: tint(projeto.color), color: projeto.color }}
                  >
                    {projeto.name}
                  </span>
                </p>
              )}

              {/* 3. Uma pausa também é foco — e é o que o ritmo pede depois. */}
              <button
                type="button"
                disabled={iniciando}
                onClick={() => iniciar(5, undefined, 'pausa')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-soft transition-colors hover:text-emerald-500 disabled:opacity-50"
              >
                <Coffee size={14} /> Ou faça uma pausa de 5 minutos
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* O placar do dia. Só aparece quando há o que mostrar. */}
        <AnimatePresence>
          {hojeStats.sessions > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SUAVE}
              className="w-full"
            >
              <Card className="flex items-center justify-around py-4">
                <span className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-primary-vibrant tabular-nums">
                    {hojeStats.minutes}
                  </span>
                  <span className="text-xs text-text-secondary">minutos hoje</span>
                </span>
                <span className="h-8 w-px bg-border" />
                <span className="flex flex-col items-center">
                  <span className="flex items-center gap-1.5 text-2xl font-bold text-text-primary tabular-nums">
                    <Timer size={18} className="text-text-soft" />
                    {hojeStats.sessions}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {hojeStats.sessions === 1 ? 'sessão' : 'sessões'}
                  </span>
                </span>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default FocusPage;
