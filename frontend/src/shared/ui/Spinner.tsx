export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

// A plain CSS border-spinner — brass arc on a faint brass track, readable on
// both the paper cards and the dark desk canvas without a surface-specific
// variant, so callers never have to think about where it's placed.
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-brass/20 border-t-brass ${SIZE_CLASSES[size]} ${className}`.trim()}
    />
  )
}
