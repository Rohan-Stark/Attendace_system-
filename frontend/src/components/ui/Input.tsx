import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', type, id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200 disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-500 disabled:dark:text-slate-400 ${
            error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40' 
              : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400'
          } ${isPassword ? 'pr-10' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-0.5"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</span>}
    </div>
  );
}
