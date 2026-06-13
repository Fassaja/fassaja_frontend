import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MascotMessage } from '@/components/mascot/MascotMessage';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <MascotMessage
          state="error"
          title="404 - Página não encontrada"
          message="Ops! Essa página se perdeu no caminho. A página que você tentou acessar não existe ou foi movida."
          mascotSize="lg"
          centered={true}
          action={{
            label: 'Voltar para o Dashboard',
            onClick: () => navigate('/'),
          }}
        />
      </div>
    </div>
  );
};

export default NotFoundPage;
