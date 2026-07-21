import { useEffect } from 'react'
import { useAuth } from '../../shared/api/services/useAuth'
import { connectSocket, disconnectSocket } from '../../shared/api/socket/socketClient'

// Non-visual: connects/disconnects the one app-wide socket as auth state
// changes. This is a deliberate, narrow exception to "auth only lives in the
// query cache, never a separate store" — it reads that state to drive a
// connection side-effect, it doesn't duplicate or store it anywhere itself.
export function RealtimeConnectionManager() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [isAuthenticated])

  return null
}
