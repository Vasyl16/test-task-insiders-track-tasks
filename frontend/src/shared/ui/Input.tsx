import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-xs tracking-wide text-ink/60 uppercase"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={`mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-ink/35 focus:border-brass focus:outline-none ${className}`.trim()}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-oxblood">{error}</p>}
    </div>
  ),
)

Input.displayName = 'Input'
