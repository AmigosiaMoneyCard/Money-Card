import { Outlet } from 'react-router-dom';
import { PullToRefresh } from '@/components/ui';

// ─── Portal Layout ─────────────────────────────────────────
// Layout for the User Portal — conceptually separate from Staff/Admin dashboard.
// Users access the portal by scanning their QR card.

export function PortalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 overscroll-contain">
      {/* Mobile Scroll-Down Pull To Refresh */}
      <PullToRefresh />

      {/* Portal Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-xs shadow-emerald-500/20">
            MC
          </div>
          <span className="font-semibold text-slate-800">My Card</span>
        </div>
      </header>

      {/* Portal Content */}
      <main className="mx-auto w-full max-w-lg flex-1 p-4">
        <Outlet />
      </main>

      {/* Portal Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Money Card • User Portal
      </footer>
    </div>
  );
}
