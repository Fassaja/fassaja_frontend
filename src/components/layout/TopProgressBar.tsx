import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Barra fininha de progresso no topo que dispara a cada navegação.
 * Usa `location.key` como key para remontar e reiniciar a animação CSS.
 */
export const TopProgressBar: React.FC = () => {
  const location = useLocation();
  return <div key={location.key} className="route-progress" aria-hidden="true" />;
};
