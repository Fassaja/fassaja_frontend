import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Mascot, MascotState } from '@/components/mascot/Mascot';

interface TodayFocusProps {
  overdue: number;
  dueToday: number;
  completedToday: number;
  totalTasks: number;
  onNewTask: () => void;
}

/**
 * Faixa de abertura do painel: o que precisa da minha atenção hoje.
 *
 * A cena dia/noite fica — é a marca, e é o único momento de cor da tela agora
 * que o resto do painel se apoia no fundo da página. Uma faixa colorida entre
 * dez cartões coloridos é ruído; sozinha, entre regiões calmas, é assinatura.
 *
 * O que saiu foi a DUPLICAÇÃO: o `bg-gradient-to-br` que estava aqui repetia,
 * em CSS, o mesmo degradê que já vem pintado dentro do PNG — e no celular, onde
 * a imagem não entra, virava uma tarja de degradê sem nenhuma cena. No lugar
 * dele, uma cor chapada da paleta, que é o fundo quando a imagem não aparece.
 *
 * O atraso ganhou ícone além da cor: sobre o azul não dá para tingir o texto
 * de vermelho, então o sinal tem de ser uma forma.
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
      className={`relative mb-8 flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white sm:p-6 ${
        isDay ? 'bg-primary-vibrant' : 'bg-brand-deep'
      }`}
    >
      {/*
        A cena vem RECORTADA (`-faixa`), e não do PNG original.
        
        O arquivo de origem é uma tela de 1920x1080 quase toda transparente,
        com a faixa desenhada no meio — e com os cantos dela já arredondados
        dentro da imagem. `object-cover` enquadra pela TELA INTEIRA, não pela
        faixa: como o centro da faixa do dia está em y=528 e o da tela em
        y=540, ela era desenhada uns 9px abaixo do centro, sobrava um fio de
        azul chapado na borda de cima e o pé da paisagem entrava cortado. À
        direita acontecia o mesmo, porque a faixa termina 14px antes da borda
        da tela. Daí o desalinhamento com o resto do conteúdo.

        Os arquivos `-faixa` são o mesmo desenho recortado no retângulo
        opaco, sem canal alfa e sem canto arredondado embutido: agora o
        enquadramento não tem nenhuma sobra para revelar, e o arredondamento
        é o do invólucro, igual ao dos outros blocos. `scale-105` saiu junto,
        que só existia para empurrar as bordas transparentes para fora.

        Só no desktop: no celular a cena cairia atrás do texto justamente na
        metade clara, onde o sol está — ali fica a cor chapada.
      */}
      <img
        src={isDay ? '/dia-faixa.png' : '/noite-faixa.png'}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 hidden h-full w-full select-none object-cover object-right md:block"
      />

      <div className="relative z-10 -my-2 shrink-0">
        <Mascot state={mascot} size="sm" animate />
      </div>

      <div className="relative z-10 min-w-0">
        <p className="flex items-center gap-2 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
          {overdue > 0 && <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />}
          {headline}
        </p>
        <p className="mt-1 text-sm text-white/85">{detail}</p>
        {totalTasks === 0 && (
          <button
            type="button"
            onClick={onNewTask}
            className="mt-3 inline-flex items-center rounded-lg bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            Criar primeira tarefa
          </button>
        )}
      </div>
    </div>
  );
};
