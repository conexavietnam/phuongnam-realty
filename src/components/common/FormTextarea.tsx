import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function FormTextarea({ label, error, className = '', ...props }: FormTextareaProps) {
  return (
    <div className="flex flex-col mb-4">
      {label && <label className="mb-1 text-sm font-medium text-navy-800">{label}</label>}
      <textarea
        className={`w-full border rounded px-3 py-2 text-navy-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-shadow resize-y min-h-[100px] ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}
