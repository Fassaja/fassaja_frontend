import React, { useEffect, useState } from 'react';
import { WalkthroughModal, WalkthroughStep } from '@/components/common/WalkthroughModal';

/**
 * Tutorial de boas-vindas por área.
 *
 * Abre automaticamente na PRIMEIRA visita de cada tela (Dashboard, Minhas
 * Tarefas, etc.), explicando "o que tem e o que faz" — no mesmo formato de
 * slideshow com mascote usado no tour da plataforma e no da IA.
 *
 * A "primeira visita" é marcada em localStorage (uma chave por área), então o
 * tutorial não reabre em F5 nem nas próximas vezes. O tour da IA continua com
 * a própria lógica (fassaja_ai_tour_seen) em AiAssistantPage.
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
  const tour = PAGE_TOURS[id];
  const storageKey = `fassaja_tour_${id}_seen`;

  // Abre o tutorial só na primeira visita desta área (não reabre em F5).
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setOpen(true);
        localStorage.setItem(storageKey, '1');
      }
    } catch {
      /* localStorage indisponível: ignora */
    }
  }, [storageKey]);

  return (
    <WalkthroughModal
      isOpen={open}
      onClose={() => setOpen(false)}
      title={tour.title}
      steps={tour.steps}
    />
  );
};
