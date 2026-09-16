// ─── Custom Premium Select Dropdown Component ─────────────────
// Elegant, accessible, animated dropdown with icons, badges, status indicators, and keyboard navigation.

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  disabled?: boolean;
  description?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  menuClassName?: string;
  id?: string;
}

export function CustomSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select an option',
  error,
  disabled = false,
  size = 'md',
  className,
  menuClassName,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (optValue: string, isDisabled?: boolean) => {
      if (isDisabled || disabled) return;
      onChange(optValue);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [disabled, onChange],
  );

  return (
    <div className={cn('flex flex-col gap-1', className)} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative w-full">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left transition-all duration-200 cursor-pointer shadow-2xs select-none',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm',
            isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/60',
            error && 'border-rose-500 ring-2 ring-rose-500/20',
            disabled && 'cursor-not-allowed opacity-50 bg-slate-50',
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            {selectedOption?.icon && (
              <span className="shrink-0 flex items-center justify-center">
                {selectedOption.icon}
              </span>
            )}
            <span
              className={cn(
                'truncate font-medium',
                selectedOption ? 'text-slate-800' : 'text-slate-400',
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedOption?.badge && (
              <span className="hidden sm:inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {selectedOption.badge}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform duration-200',
                isOpen && 'rotate-180 text-emerald-600',
              )}
            />
          </div>
        </button>

        {/* Dropdown Options Popover */}
        {isOpen && (
          <div
            ref={menuRef}
            role="listbox"
            className={cn(
              'absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 min-w-[210px]',
              menuClassName,
            )}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => handleSelect(option.value, option.disabled)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-150 cursor-pointer select-none',
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 font-semibold border-l-2 border-emerald-600 pl-2'
                      : 'text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-900',
                    option.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {option.icon && (
                      <span className="shrink-0 flex items-center justify-center">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{option.label}</p>
                      {option.description && (
                        <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                          isSelected
                            ? 'bg-emerald-200/70 text-emerald-900'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-emerald-700 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}
