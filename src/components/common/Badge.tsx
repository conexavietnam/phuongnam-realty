import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'navy' | 'success' | 'danger';
  className?: string;
}

export function Badge({ children, variant = 'gold', className = '' }: BadgeProps) {
  const baseStyles = 'absolute top-4 left-4 px-3 py-1 text-xs font-semibold rounded-full z-10 shadow-sm';
  
  const variants = {
    gold: 'bg-gold-500 text-white',
    navy: 'bg-navy-900 text-white',
    success: 'bg-green-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
