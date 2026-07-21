import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../shared/api/services/useAuth'

export function PublicRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return null
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  // 'unauthenticated' and 'error' both fall through to the public page -
  // if we can't confirm a session is valid, showing login rather than
  // blocking the page is the safe default (no protected data at stake here).
  return <Outlet />
}
