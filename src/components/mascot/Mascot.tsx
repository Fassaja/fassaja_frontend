import React from 'react';

export type MascotState = 'happy' | 'strong' | 'confused' | 'sad' | 'error' | 'celebrate' | 'investigate';

interface MascotProps {
  state?: MascotState;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const sizeClasses = {
  xs: 'w-16 h-16',
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
};

const mascotImages: Record<MascotState, string> = {
  happy: '/bobjoia.png',
  strong: '/bobforte.png',
  confused: '/bobduvida.png',
  sad: '/bobtriste.png',
  error: '/boberror404.png',
  celebrate: '/bobparabens.png',
  investigate: '/bobinvestigador.png',
};

/**
 * Flutuação via CSS (animate-bob): roda no compositor da GPU, sem custo de JS
 * por frame — vários Bobs na tela não pesam. Reduced motion é respeitado pelo
 * bloco global em index.css.
 */
export const Mascot: React.FC<MascotProps> = ({
  state = 'happy',
  size = 'md',
  animate = true,
}) => {
  const imageSrc = mascotImages[state];

  return (
    <div
      className={`flex items-center justify-center ${sizeClasses[size]} ${animate ? 'animate-bob' : ''}`}
    >
      <img
        src={imageSrc}
        alt={`Mascot ${state}`}
        className="w-full h-full object-contain drop-shadow-lg"
      />
    </div>
  );
};
