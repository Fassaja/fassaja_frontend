import React from 'react';
import { WalkthroughModal, WalkthroughStep } from '@/components/common/WalkthroughModal';

interface AiHowToModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: WalkthroughStep[] = [
  {
    image: '/bobOla.png',
    title: 'O assistente de IA',
    text: 'Transformo documentos em projetos com tarefas. Veja em 4 passos.',
  },
  {
    image: '/bobapontando.png',
    title: '1. Envie o conteúdo',
    text: 'Cole um texto, importe ou arraste um PDF, Word, .txt ou .md.',
  },
  {
    image: '/bobinvestigador.png',
    title: '2. Escolha o modo e gere',
    text: '"Estruturar projeto" vira um plano. "Analisar melhorias" sugere o que melhorar. Clique em Gerar.',
  },
  {
    image: '/bobforte.png',
    title: '3. Revise e ajuste',
    text: 'Edite os cards: título, prioridade, data e responsável. Crie um projeto novo ou some a um existente.',
  },
  {
    image: '/bobheroi.png',
    title: '4. Aprove e pronto',
    text: 'Aprove e os cards viram tarefas. São 5 usos de IA por semana. Bora!',
  },
];

export const AiHowToModal: React.FC<AiHowToModalProps> = ({ isOpen, onClose }) => (
  <WalkthroughModal
    isOpen={isOpen}
    onClose={onClose}
    title="Como usar o Assistente de IA"
    steps={STEPS}
  />
);
