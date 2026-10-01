import React from 'react';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}

export function FormSelect({ label, icon, options, placeholder, error, className = '', ...props }: FormSelectProps) {
  return (
    <div className="flex flex-col mb-4">
      {label && <label className="mb-1 text-sm font-medium text-navy-800">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <select
          className={`w-full border rounded px-3 py-2 text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-shadow appearance-none ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
