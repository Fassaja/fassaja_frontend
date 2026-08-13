import React from 'react';
import { Mascot, MascotState } from '@/components/mascot/Mascot';

interface TodayFocusProps {
  overdue: number;
  dueToday: number;
  completedToday: number;
  totalTasks: number;
  onNewTask: () => void;
}

/**
 * Bloco de abertura do painel.
 *
 * Substitui o banner de saudação, que dizia "Bom dia!" logo abaixo do "Olá,
 * {nome}" da barra superior — duas saudações e uma frase motivacional
 * rotativa antes de qualquer informação. A cena dia/noite e o Bob continuam
 * (são da marca); o que mudou é o texto, que agora responde à única pergunta
 * que importa ao abrir o app: o que precisa da minha atenção hoje.
 *
 * Os chips de nível/XP/sequência saíram daqui porque repetiam, no topo, o que
 * o card "Seu nível" já mostra mais abaixo na mesma tela.
 */
export const TodayFocus: React.FC<TodayFocusProps> = ({
  overdue,
  dueToday,
  completedToday,
  totalTasks,
  onNewTask,
}) => {
  // Cena de fundo conforme o horário: dia das 5h às 17h, noite das 17h às 5h.
  const isDay = (() => {
    const h = new Date().getHours();
    return h >= 5 && h < 17;
  })();

  const { headline, detail, mascot } = ((): {
    headline: string;
    detail: string;
    mascot: MascotState;
  } => {
    if (totalTasks === 0)
      return {
        headline: 'Tudo começa com uma tarefa',
        detail: 'Crie a primeira e ela aparece aqui.',
        mascot: 'happy',
      };
    if (overdue > 0)
      return {
        headline: `${overdue} ${overdue === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`,
        detail:
          dueToday > 0
            ? `E mais ${dueToday} ${dueToday === 1 ? 'vence' : 'vencem'} hoje.`
            : 'Nada mais vence hoje.',
        mascot: 'sad',
      };
    if (dueToday > 0)
      return {
        headline: `${dueToday} ${dueToday === 1 ? 'tarefa vence' : 'tarefas vencem'} hoje`,
        detail:
          completedToday > 0
            ? `${completedToday} ${completedToday === 1 ? 'concluída' : 'concluídas'} até agora.`
            : 'Nenhuma atrasada.',
        mascot: 'strong',
      };
    return {
      headline: 'Nada vence hoje',
      detail:
        completedToday > 0
          ? `${completedToday} ${completedToday === 1 ? 'tarefa concluída' : 'tarefas concluídas'} hoje.`
          : 'Sem prazos e sem atrasos.',
      mascot: 'celebrate',
    };
  })();

  return (
    <div
      className={`mb-6 flex items-center gap-4 rounded-2xl text-white p-5 sm:p-6 relative overflow-hidden bg-gradient-to-br ${
        isDay ? 'from-primary-vibrant to-brand-deep' : 'from-[#243089] to-[#0a1640]'
      }`}
    >
      {/* Cena decorativa: só no desktop. No mobile fica só o gradiente azul. */}
      <img
        src={isDay ? '/dia.png' : '/noite.png'}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="hidden md:block absolute inset-0 h-full w-full object-cover object-right scale-105 pointer-events-none select-none"
      />

      <div className="shrink-0 -my-2 relative z-10">
        <Mascot state={mascot} size="sm" animate />
      </div>

      <div className="relative z-10 min-w-0">
        <p className="text-xl font-extrabold leading-tight">{headline}</p>
        <p className="text-white/85 text-sm mt-0.5">{detail}</p>
        {totalTasks === 0 && (
          <button
            type="button"
            onClick={onNewTask}
            className="mt-3 inline-flex items-center px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold backdrop-blur-sm transition-colors"
          >
            Criar primeira tarefa
          </button>
        )}
      </div>
    </div>
  );
};
