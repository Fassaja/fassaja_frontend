import React, { useEffect, useState } from 'react';
import { WalkthroughModal, WalkthroughStep } from '@/components/common/WalkthroughModal';

// Sinais (localStorage):
//  - NEW_USER_KEY: marcado no cadastro; indica "usuário novo".
//  - SEEN_KEY: marcado ao abrir o tour; impede reabrir (inclusive em F5).
const NEW_USER_KEY = 'fassaja_new_user';
const SEEN_KEY = 'fassaja_tour_seen';
// Evento global para abrir o tour de qualquer lugar (ex.: botão "Ver tutorial").
export const OPEN_TOUR_EVENT = 'fassaja:open-tour';

const STEPS: WalkthroughStep[] = [
  {
    image: '/bobOla.png',
    title: 'Bem-vindo ao Fassaja',
    text: 'Seu painel para organizar tarefas e projetos. Veja os principais espaços em 1 minuto.',
  },
  {
    image: '/bobapontando.png',
    title: 'Minhas Tarefas',
    text: 'Crie, filtre, priorize e conclua suas tarefas. Tudo em um só lugar.',
  },
  {
    image: '/bobforte.png',
    title: 'Projetos',
    text: 'Agrupe tarefas por projeto e acompanhe o progresso de cada um.',
  },
  {
    image: '/bobjoia.png',
    title: 'Equipe',
    text: 'Convide pessoas, monte times e atribua responsáveis às tarefas.',
  },
  {
    image: '/bobinvestigador.png',
    title: 'Assistente de IA',
    text: 'Envie um documento e a IA monta projetos e cards prontos para você revisar.',
  },
  {
    image: '/bobheroi.png',
    title: 'Relatórios e Calendário',
    text: 'Acompanhe seu desempenho e seus prazos. Pronto, agora é com você!',
  },
];

/**
 * Tour de boas-vindas da plataforma. Renderizado uma vez no AppLayout.
 * Abre automaticamente só para quem acabou de se cadastrar (NEW_USER_KEY),
 * uma única vez (SEEN_KEY) — não reabre em F5. Também abre pelo evento
 * OPEN_TOUR_EVENT (botão "Ver tutorial" no Fale conosco).
 */
export const PlatformTourModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener(OPEN_TOUR_EVENT, openHandler);

    try {
      const isNew = localStorage.getItem(NEW_USER_KEY);
      const seen = localStorage.getItem(SEEN_KEY);
      if (isNew && !seen) {
        setOpen(true);
        localStorage.setItem(SEEN_KEY, '1');
        localStorage.removeItem(NEW_USER_KEY);
      }
    } catch {
      /* localStorage indisponível: ignora */
    }

    return () => window.removeEventListener(OPEN_TOUR_EVENT, openHandler);
  }, []);

  return (
    <WalkthroughModal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Conheça o Fassaja"
      steps={STEPS}
    />
  );
};
