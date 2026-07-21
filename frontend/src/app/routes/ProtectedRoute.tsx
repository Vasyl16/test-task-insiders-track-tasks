import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../shared/api/services/useAuth'
import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { ErrorState } from '../../shared/ui/ErrorState'

export function ProtectedRoute() {
  const { status, error, retry } = useAuth()

  if (status === 'loading') {
    return null
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (status === 'error') {
    // Deliberately not a redirect - we don't actually know whether this
    // session is valid, just that we couldn't confirm it (network/5xx).
    // Staying put + offering a retry avoids logging out a valid session
    // over a transient failure.
    return (
      <div className="flex min-h-screen items-center justify-center bg-desk px-4">
        <ErrorState
          message={getErrorMessage(error, 'Failed to verify your session.')}
          onRetry={() => void retry()}
        />
      </div>
    )
  }

  return <Outlet />
}
