import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-xs tracking-wide text-ink/60 uppercase"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        className={`mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 font-body text-sm text-ink focus:border-brass focus:outline-none ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-oxblood">{error}</p>}
    </div>
  ),
)

Select.displayName = 'Select'
