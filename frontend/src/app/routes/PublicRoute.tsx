import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../shared/api/services/useAuth'

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
