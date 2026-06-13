import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showImage?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', showImage = false }) => {
  if (showImage) {
    return (
      <img
        src="/logofassaja.png"
        alt="Fassaja"
        className={`${sizeClasses[size]} object-contain`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center`}>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-dark to-primary-vibrant bg-clip-text text-transparent">
        F
      </h1>
    </div>
  );
};
