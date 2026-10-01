import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function FormInput({ label, icon, error, className = '', ...props }: FormInputProps) {
  return (
    <div className="flex flex-col mb-4">
      {label && <label className="mb-1 text-sm font-medium text-navy-800">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full border rounded px-3 py-2 text-navy-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-shadow ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
