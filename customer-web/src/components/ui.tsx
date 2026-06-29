import type { ReactNode, ButtonHTMLAttributes } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline'; children: ReactNode }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-600 disabled:opacity-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  }[variant];
  return (
    <button
      className={`rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = 'orange' }: { children: ReactNode; color?: 'orange' | 'green' | 'gray' }) {
  const c = {
    orange: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-600',
  }[color];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>;
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-20 text-center">
      <p className="text-base font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}
