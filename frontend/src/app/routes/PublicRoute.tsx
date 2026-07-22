import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../shared/api/services/useAuth'
import { Spinner } from '../../shared/ui/Spinner'

export function PublicRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-desk">
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  // 'unauthenticated' and 'error' both fall through to the public page -
  // if we can't confirm a session is valid, showing login rather than
  // blocking the page is the safe default (no protected data at stake here).
  return <Outlet />
}
