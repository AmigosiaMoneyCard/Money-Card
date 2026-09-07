// ─── Profile Menu Component ─────────────────────────────────
// Accessible user profile dropdown for the top bar (SUPER_ADMIN & ORG_ADMIN).
// Contains Profile Info, Settings, and Sign Out.
// NO "Forgot Password" is in this dropdown.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { LogOut, ChevronDown, ShieldCheck, Settings } from 'lucide-react';
import { cn } from '@/utils';

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-xs shadow-emerald-500/20">
          {userInitial}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-slate-900">
            {user?.name || 'Admin'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Org Admin'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95"
        >
          {/* Header Info */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700 border border-emerald-100">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Role: {user?.role ? (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Org Admin') : 'Loading...'}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Account Settings
            </button>
          </div>

          {/* Footer Action */}
          <div className="border-t border-slate-100 pt-1">
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:bg-rose-50"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
