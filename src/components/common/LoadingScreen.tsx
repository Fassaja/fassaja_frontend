import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

// Tela de carregamento (Bob correndo) enquanto a API responde.
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
    <motion.p
      className="mt-1 text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-vibrant via-primary-dark to-primary-vibrant bg-[length:200%_auto] bg-clip-text text-transparent max-w-lg"
      animate={{ backgroundPosition: ['0% center', '200% center'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      {message}
    </motion.p>
  </div>
);
