import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-200 rounded';
  
  const variants = {
    primary: 'bg-gold-500 text-white hover:bg-gold-600',
    secondary: 'bg-navy-900 text-white hover:bg-navy-800',
    outline: 'border-2 border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white',
    ghost: 'text-navy-800 hover:text-gold-500',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
