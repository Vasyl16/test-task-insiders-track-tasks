import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="motion-safe:animate-[ledger-fade-in_0.15s_ease-out] absolute inset-0 bg-desk/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="motion-safe:animate-[ledger-card-in_0.2s_ease-out] relative w-full max-w-md rounded-2xl bg-paper p-8 shadow-2xl"
      >
        <span
          aria-hidden="true"
          className="absolute -top-2.5 left-7 h-5 w-9 rounded-b-sm bg-brass shadow-sm"
        />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full font-mono text-lg text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          ✕
        </button>

        <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>

        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
