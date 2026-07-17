import { Button } from './Button'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

// For a failed fetch, distinct from an empty-but-successful result (no
// workspaces yet, no tasks in this column) and from a genuine 404/403 (the
// resource really doesn't exist / isn't yours) — this is "the request
// itself failed," so it always offers a retry.
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mt-4 rounded-2xl border border-oxblood/30 bg-oxblood/10 p-8 text-center">
      <p className="font-display text-lg text-paper">Something went wrong</p>
      <p className="mt-1 text-sm text-fog">{message}</p>
      {onRetry && (
        <Button variant="nav" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  )
}
