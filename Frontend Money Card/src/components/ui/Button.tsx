import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

// ─── Button Variants ───────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 hover:shadow-sm hover:shadow-emerald-500/30 active:from-emerald-800 active:to-teal-800',
  secondary:
    'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 active:bg-slate-300',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs shadow-rose-500/20 hover:from-rose-700 hover:to-red-700 active:from-rose-800 active:to-red-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2.5',
};

// ─── Button Component ──────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
