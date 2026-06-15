import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

// Tela de carregamento (Bob correndo) enquanto a API responde.
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <img
      src="/bobcorrendogif.gif"
      alt="Carregando"
      className="w-44 h-44 object-contain select-none"
      draggable={false}
    />
    <p className="text-text-secondary font-medium -mt-2">{message}</p>
  </div>
);
