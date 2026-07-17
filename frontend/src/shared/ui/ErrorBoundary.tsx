import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// Catches render-time crashes (a bug throwing during render, not a failed
// API call — those are handled per-page via isError/ErrorState) so a broken
// component shows a fallback instead of a blank white screen. Must be a
// class component; React has no hook equivalent for this.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-2xl text-paper">Something went wrong</p>
          <p className="max-w-md text-sm text-fog">
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Reload
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
