import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
