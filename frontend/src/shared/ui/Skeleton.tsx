export interface SkeletonProps {
  className?: string
}

// A single pulsing placeholder block, with no color/size/shape opinion of
// its own — callers compose it into whatever they're standing in for (a
// paper-toned bar for a ledger row, a card-toned block for a Kanban card),
// same "dumb primitive" approach as the rest of shared/ui.
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md ${className}`.trim()} />
}
