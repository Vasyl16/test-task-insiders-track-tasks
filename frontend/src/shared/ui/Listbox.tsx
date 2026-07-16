import { useEffect, useRef, useState } from 'react'

export interface ListboxOption<T extends string> {
  value: T
  label: string
  dotClassName?: string
}

export interface ListboxProps<T extends string> {
  id: string
  label: string
  value: T
  options: ListboxOption<T>[]
  onChange: (value: T) => void
  error?: string
}

export function Listbox<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  error,
}: ListboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Capture phase + stopPropagation: without this, Escape also
        // reaches Modal's own (bubble-phase) Escape listener and closes
        // the whole modal instead of just this dropdown.
        event.stopPropagation()
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <span
        id={`${id}-label`}
        className="block font-mono text-xs tracking-wide text-ink/60 uppercase"
      >
        {label}
      </span>

      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-left font-body text-sm text-ink focus:border-brass focus:outline-none"
      >
        {selected?.dotClassName && (
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected.dotClassName}`}
          />
        )}
        <span className="flex-1">{selected?.label ?? 'Select…'}</span>
        <span
          aria-hidden="true"
          className={`text-ink/40 transition-transform ${isOpen ? '-rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="motion-safe:animate-[ledger-card-in_0.15s_ease-out] absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-ink/15 bg-paper shadow-xl"
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left font-body text-sm transition-colors hover:bg-ink/5 ${
                  option.value === value ? 'bg-brass/10 text-ink' : 'text-ink/80'
                }`}
              >
                {option.dotClassName && (
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dotClassName}`}
                  />
                )}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1.5 text-sm text-oxblood">{error}</p>}
    </div>
  )
}
