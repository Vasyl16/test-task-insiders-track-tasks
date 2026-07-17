import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-xs tracking-wide text-ink/60 uppercase"
      >
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={3}
        className={`mt-1.5 w-full resize-y rounded-lg border border-ink/15 bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-ink/35 focus:border-brass focus:outline-none ${className}`.trim()}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-oxblood">{error}</p>}
    </div>
  ),
)

Textarea.displayName = 'Textarea'
