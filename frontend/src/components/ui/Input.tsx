import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">
        {label}
      </label>
      <input
        id={inputId}
        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200 disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-500 disabled:dark:text-slate-400 ${
          error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40' 
            : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</span>}
    </div>
  );
}
