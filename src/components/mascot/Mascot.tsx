import React from 'react';
import { motion } from 'framer-motion';

export type MascotState = 'happy' | 'strong' | 'confused' | 'sad' | 'error';

interface MascotProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const sizeClasses = {
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
};

export const Mascot: React.FC<MascotProps> = ({
  state = 'happy',
  size = 'md',
  animate = true,
}) => {
  const imageSrc = mascotImages[state];

  return (
    <motion.div
      className={`flex items-center justify-center ${sizeClasses[size]}`}
      animate={animate ? { y: [0, -10, 0] } : {}}
      transition={animate ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <img
        src={imageSrc}
        alt={`Mascot ${state}`}
        className="w-full h-full object-contain drop-shadow-lg"
      />
    </motion.div>
  );
};
