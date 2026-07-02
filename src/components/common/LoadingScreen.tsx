import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

// Tela de carregamento (Bob correndo) enquanto a API responde.
// Pulso do texto em CSS puro (animate-pulse-soft): nada de JS por frame.
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Enquanto o sistema carrega, estruture seu pensamento...',
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <img
      src="/bobcorrendogif.gif"
      alt="Carregando"
      className="w-64 h-64 sm:w-72 sm:h-72 object-contain select-none"
      draggable={false}
    />
    <p className="mt-1 text-lg sm:text-xl font-bold text-primary-dark max-w-lg animate-pulse-soft">
      {message}
    </p>
  </div>
);
