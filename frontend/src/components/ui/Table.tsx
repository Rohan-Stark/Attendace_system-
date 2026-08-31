import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 dark:bg-slate-900/50">{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${className}`}>{children}</tr>;
}

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 ${className}`} {...props}>
      {children}
    </td>
  );
}
