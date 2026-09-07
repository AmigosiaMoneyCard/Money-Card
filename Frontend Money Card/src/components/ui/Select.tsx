import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/utils';
import { ChevronDown } from 'lucide-react';

// ─── Select Component ──────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options = [], groups, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-all duration-200 shadow-xs',
              'border-slate-300 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
              'hover:border-slate-400',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {groups ? (
              groups.map((group) => (
                <optgroup
                  key={group.label}
                  label={group.label}
                  className="bg-white font-semibold text-emerald-700"
                >
                  {group.options.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="bg-white text-slate-900 font-normal"
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled} className="bg-white text-slate-900">
                  {option.label}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
