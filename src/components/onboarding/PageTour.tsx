import React, { useCallback, useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { WalkthroughModal, WalkthroughStep } from '@/components/common/WalkthroughModal';
import { useAjudaDaArea } from './AjudaDaArea';

/**
 * Tutorial por área — oferecido, não imposto.
 *
 * Antes, cada uma das oito áreas abria um slideshow de três telas por cima do
 * conteúdo na primeira visita. Quem entrava e clicava em "Minhas Tarefas" já
 * tinha fechado dois diálogos antes de ver a primeira tarefa, e percorrer o
 * menu inteiro custava vinte e quatro slides — tudo antes de existir qualquer
 * dado sobre o qual o tutorial pudesse falar. Um diálogo modal interrompe: ele
 * rouba o foco, cobre justamente a tela que está sendo explicada e cobra uma
 * decisão antes de a pessoa saber se quer aquilo.
 *
 * No lugar dele, uma faixa fina no topo da área, na primeira visita, que
 * convida sem bloquear e sai com um clique. O slideshow continua existindo com
 * o mesmo conteúdo — só passou a ser aberto por quem quer.
 *
 * E, principalmente, a ajuda deixou de ser de uso único: dispensada ou vista,
 * ela continua a um clique no botão da barra superior, que é onde alguém
 * procura ajuda no momento em que ela faz falta — e não no primeiro segundo.
 *
 * A marca do convite continua em `fassaja_tour_<id>_seen`, com o mesmo nome de
 * antes de propósito: quem já tinha visto o tutorial antigo não recebe a faixa
 * agora, como se fosse novidade.
 */

export type PageTourId =
  | 'dashboard'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'agenda'
  | 'priorities'
  | 'reports'
  | 'team';

interface PageTourDef {
  title: string;
  steps: WalkthroughStep[];
}

export const PAGE_TOURS: Record<PageTourId, PageTourDef> = {
  dashboard: {
    title: 'Conhecendo o painel',
    steps: [
      {
        image: '/bobOla.png',
        title: 'Este é o seu painel',
        text: 'Uma visão geral do seu dia: métricas, progresso e o que precisa de atenção.',
      },
      {
        image: '/bobapontando.png',
        title: 'Seus números',
        text: 'Veja total de tarefas, concluídas, em andamento e atrasadas num piscar de olhos.',
      },
      {
        image: '/bobforte.png',
        title: 'Ações rápidas',
        text: 'Crie tarefas e pule direto para as áreas que você mais usa.',
      },
    ],
  },
  tasks: {
    title: 'Conhecendo as tarefas',
    steps: [
      {
        image: '/bobOla.png',
        title: 'Minhas tarefas',
        text: 'Aqui ficam todas as suas tarefas, reunidas em um só lugar.',
      },
      {
        image: '/bobapontando.png',
        title: 'Crie, filtre e organize',
        text: 'Adicione tarefas, defina prioridade e data, e filtre por status.',
      },
      {
        image: '/bobheroi.png',
        title: 'Conclua e avance',
        text: 'Marque como concluída para acompanhar seu progresso.',
      },
    ],
  },
  projects: {
    title: 'Conhecendo os projetos',
    steps: [
      {
        image: '/bobjoia.png',
        title: 'Projetos',
        text: 'Agrupe tarefas por projeto e acompanhe o progresso de cada um.',
      },
      {
        image: '/bobapontando.png',
        title: 'Crie um projeto',
        text: 'Dê um nome, escolha uma cor e comece a organizar suas tarefas.',
      },
      {
        image: '/bobforte.png',
        title: 'Acompanhe o avanço',
        text: 'Veja quantas tarefas há em cada projeto e quantas já foram concluídas.',
      },
    ],
  },
  calendar: {
    title: 'Conhecendo o calendário',
    steps: [
      {
        image: '/bobOla.png',
        title: 'Calendário',
        text: 'Suas tarefas distribuídas por data, numa visão de mês.',
      },
      {
        image: '/bobapontando.png',
        title: 'Navegue pelos dias',
        text: 'Clique em um dia para ver as tarefas com prazo naquela data.',
      },
      {
        image: '/bobforte.png',
        title: 'Nada passa batido',
        text: 'Enxergue os prazos com clareza e planeje sua semana.',
      },
    ],
  },
  agenda: {
    title: 'Conhecendo a agenda',
    steps: [
      {
        image: '/bobOla.png',
        title: 'Agenda',
        text: 'Seus compromissos com data e horário — separados das tarefas.',
      },
      {
        image: '/bobapontando.png',
        title: 'Marque compromissos',
        text: 'Crie eventos com horário e receba lembretes na hora certa.',
      },
      {
        image: '/bobforte.png',
        title: 'No horário certo',
        text: 'Acompanhe reuniões e eventos sem confundir com suas tarefas.',
      },
    ],
  },
  priorities: {
    title: 'Conhecendo as prioridades',
    steps: [
      {
        image: '/bobinvestigador.png',
        title: 'Prioridades',
        text: 'Tudo que é prioridade alta e ainda está em aberto, reunido aqui.',
      },
      {
        image: '/bobapontando.png',
        title: 'Foco no que importa',
        text: 'Resolva primeiro o que tem maior impacto no seu dia.',
      },
      {
        image: '/bobheroi.png',
        title: 'Zere a lista',
        text: 'Conclua as prioridades e sinta o alívio de estar em dia.',
      },
    ],
  },
  reports: {
    title: 'Conhecendo os relatórios',
    steps: [
      {
        image: '/bobinvestigador.png',
        title: 'Relatórios',
        text: 'Suas estatísticas de produtividade reunidas em gráficos.',
      },
      {
        image: '/bobapontando.png',
        title: 'Entenda seus números',
        text: 'Tarefas por status, prioridade e tag, além da sua taxa de conclusão.',
      },
      {
        image: '/bobforte.png',
        title: 'Melhore sempre',
        text: 'Acompanhe tendências e descubra onde vale a pena focar.',
      },
    ],
  },
  team: {
    title: 'Conhecendo a equipe',
    steps: [
      {
        image: '/bobjoia.png',
        title: 'Quatro abas, quatro perguntas',
        text: 'Painel: como a equipe está. Meu trabalho: o que esperam de você. Pessoas: quem carrega o quê. Gestão: quem manda em quê.',
      },
      {
        image: '/bobapontando.png',
        title: 'Cada pessoa tem um papel',
        text: 'Membro entrega tarefas. Gerente distribui o trabalho e convida. Administrador cuida das pessoas. Dono responde pela equipe.',
      },
      {
        image: '/bobforte.png',
        title: 'Cargo é rótulo, papel é poder',
        text: '"Designer" é como a equipe chama a pessoa. O papel é o que ela pode fazer aqui dentro — são coisas diferentes.',
      },
    ],
  },
};

interface PageTourProps {
  id: PageTourId;
}

export const PageTour: React.FC<PageTourProps> = ({ id }) => {
  const [open, setOpen] = useState(false);
  const [convite, setConvite] = useState(false);
  const tour = PAGE_TOURS[id];
  const storageKey = `fassaja_tour_${id}_seen`;
  const { registrar } = useAjudaDaArea();

  const marcarVisto = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* localStorage indisponível: ignora */
    }
    setConvite(false);
  }, [storageKey]);

  // O convite aparece uma vez por área. Quem abrir o tutorial pelo botão da
  // barra depois disso não faz a faixa voltar.
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setConvite(true);
    } catch {
      /* localStorage indisponível: ignora */
    }
  }, [storageKey]);

  // Enquanto esta área estiver na tela, o botão de ajuda da barra abre ESTE
  // tutorial.
  const abrir = useCallback(() => {
    marcarVisto();
    setOpen(true);
  }, [marcarVisto]);

  useEffect(() => registrar(abrir), [registrar, abrir]);

  return (
    <>
      {convite && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-bg-secondary/60 px-3 py-2.5">
          <HelpCircle size={18} className="shrink-0 text-text-secondary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-text-secondary">
            Primeira vez por aqui?{' '}
            <button
              type="button"
              onClick={abrir}
              className="font-semibold text-primary-vibrant underline underline-offset-2 transition-colors hover:text-primary-hover"
            >
              {tour.title.replace(/^Conhecendo /, 'Ver como funciona ')}
            </button>
            .
          </p>
          <button
            type="button"
            onClick={marcarVisto}
            aria-label="Dispensar a dica desta área"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-text-soft transition-colors hover:bg-surface hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <WalkthroughModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={tour.title}
        steps={tour.steps}
      />
    </>
  );
};
