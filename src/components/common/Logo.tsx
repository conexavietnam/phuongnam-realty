import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  showTagline = false,
}) => {
  const isLight = variant === 'light';

  const sizeClasses = {
    sm: {
      icon: 'w-7 h-7',
      title: 'text-base',
      subtitle: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      icon: 'w-9 h-9',
      title: 'text-lg sm:text-xl',
      subtitle: 'text-[10px]',
      gap: 'gap-2.5',
    },
    lg: {
      icon: 'w-12 h-12',
      title: 'text-2xl sm:text-3xl',
      subtitle: 'text-xs',
      gap: 'gap-3',
    },
  }[size];

  return (
    <Link to="/" className={`inline-flex items-center ${sizeClasses.gap} group ${className}`}>
      {/* Golden Architectural Crest */}
      <div className={`relative ${sizeClasses.icon} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <img
          src="/logo.svg"
          alt="Phương Nam Realty"
          className="w-full h-full object-contain filter drop-shadow-sm"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-bold tracking-tight uppercase transition-colors ${sizeClasses.title} ${
            isLight
              ? 'text-white group-hover:text-gold-400'
              : 'text-navy-900 group-hover:text-gold-600'
          }`}
        >
          Phương Nam{' '}
          <span className="text-gold-500 font-extrabold tracking-wider">Realty</span>
        </span>
        {showTagline && (
          <span
            className={`font-semibold tracking-[0.2em] uppercase mt-1 ${sizeClasses.subtitle} ${
              isLight ? 'text-gold-300/80' : 'text-navy-500'
            }`}
          >
            Luxury Real Estate
          </span>
        )}
      </div>
    </Link>
  );
};
