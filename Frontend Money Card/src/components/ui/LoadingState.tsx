import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

// ─── Loading Spinner ───────────────────────────────────────

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2 className={cn('animate-spin text-emerald-600', spinnerSizes[size], className)} />
  );
}

// ─── Loading State (full-area) ─────────────────────────────

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}>
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        <LoadingSpinner size="lg" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

// ─── Loading Overlay ───────────────────────────────────────

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        {message && <p className="text-sm font-medium text-slate-700">{message}</p>}
      </div>
    </div>
  );
}
