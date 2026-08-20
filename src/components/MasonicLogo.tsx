import React from 'react';
import masonicImage from '../assets/images/masonic_logo_1786626579786.jpg';

interface MasonicLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MasonicLogo: React.FC<MasonicLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`relative flex items-center justify-center rounded-full overflow-hidden border border-amber-400/40 shadow-lg shadow-amber-950/50 ${sizeClasses[size]} ${className}`}>
      <img
        src={masonicImage}
        alt="Símbolo Maçônico Esquadro e Compasso"
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};

export const MasonicLogoSVG: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-amber-300' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Square & Compasses vector design */}
      {/* Compasses Legs */}
      <path
        d="M50 12 L15 85 H24 L50 32 L76 85 H85 Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Square arms */}
      <path
        d="M20 40 L50 70 L80 40 L88 48 L50 86 L12 48 Z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Letter G in the center */}
      <text
        x="50"
        y="53"
        fontSize="24"
        fontWeight="bold"
        fontFamily="serif"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
      >
        G
      </text>
    </svg>
  );
};
