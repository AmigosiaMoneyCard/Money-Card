import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/utils';

export interface PullToRefreshProps {
  children?: ReactNode;
  onRefresh?: () => Promise<void> | void;
  pullDownThreshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * PullToRefresh component for mobile web applications.
 * Triggers a refresh when the user scrolls/pulls down from the top on mobile.
 */
export function PullToRefresh({
  children,
  onRefresh,
  pullDownThreshold = 65,
  maxPullDistance = 95,
  disabled = false,
  containerRef,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const canPullRef = useRef(false);

  // Helper to determine if we are scrolled to the top
  const isScrolledToTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop <= 1;
    }
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      return mainEl.scrollTop <= 1;
    }
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 1;
  }, [containerRef]);

  // Check if current device or viewport is mobile/touch
  const isMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileWidth = window.innerWidth <= 1024;
    return hasTouch || isMobileWidth;
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(50); // Hold spinner at 50px

    try {
      // Dispatch custom events to inform active query listeners
      window.dispatchEvent(new Event('app-refresh'));
      window.dispatchEvent(new Event('cards-updated'));

      if (onRefresh) {
        await onRefresh();
      } else {
        // Default mobile web app behavior: smooth reload after giving visual feedback
        await new Promise((resolve) => setTimeout(resolve, 600));
        window.location.reload();
        return;
      }
    } catch {
      // Fallback
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (!isMobile()) return;

      // Do not trigger if user is interacting with form controls or open modal
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('[role="dialog"]') ||
          target.closest('button'))
      ) {
        canPullRef.current = false;
        return;
      }

      if (isScrolledToTop()) {
        canPullRef.current = true;
        startYRef.current = e.touches[0].clientY;
      } else {
        canPullRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startYRef.current;

      if (diffY > 0) {
        // Pulling down
        if (isScrolledToTop()) {
          // Calculate damped pull distance
          const damped = Math.min(diffY * 0.45, maxPullDistance);
          setPullDistance(damped);
          setIsPulling(true);

          // Prevent native page scrolling bounce if we are actively pulling down
          if (e.cancelable && damped > 10) {
            e.preventDefault();
          }
        } else {
          canPullRef.current = false;
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        // Pulling up
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const onTouchEnd = () => {
      if (!canPullRef.current) return;
      canPullRef.current = false;
      setIsPulling(false);

      if (pullDistance >= pullDownThreshold && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [
    disabled,
    isMobile,
    isScrolledToTop,
    isRefreshing,
    pullDistance,
    pullDownThreshold,
    maxPullDistance,
    handleRefresh,
  ]);

  const isTriggered = pullDistance >= pullDownThreshold;

  return (
    <>
      {/* Pull down indicator pill at the top of the mobile viewport */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          id="pull-to-refresh-indicator"
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center"
          style={{
            transform: `translateY(${Math.max(12, pullDistance - 15)}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          aria-live="polite"
        >
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md transition-all',
              isTriggered || isRefreshing
                ? 'border-emerald-400 bg-white/95 text-emerald-700 shadow-emerald-500/20'
                : 'border-slate-200 bg-white/90 text-slate-600 shadow-slate-300/40',
            )}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4 transition-transform',
                isRefreshing
                  ? 'animate-spin text-emerald-600'
                  : isTriggered
                  ? 'text-emerald-600'
                  : 'text-slate-500',
              )}
              style={
                isRefreshing
                  ? undefined
                  : { transform: `rotate(${Math.min(pullDistance * 4.5, 360)}deg)` }
              }
            />
            <span className="text-xs font-semibold select-none">
              {isRefreshing
                ? 'Refreshing web app...'
                : isTriggered
                ? 'Release to refresh'
                : 'Pull down to refresh'}
            </span>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
