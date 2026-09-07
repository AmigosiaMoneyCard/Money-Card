import { Outlet } from 'react-router-dom';

// ─── Auth Layout ───────────────────────────────────────────
// Layout for unauthenticated pages (login, etc.)
// Separate from the dashboard layout.

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-500/20">
            MC
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Money Card</h1>
          <p className="text-sm text-slate-500">Reusable QR card payment platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
