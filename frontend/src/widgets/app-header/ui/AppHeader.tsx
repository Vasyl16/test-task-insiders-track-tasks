import { useAuth } from '../../../shared/api/services/useAuth'
import { Button } from '../../../shared/ui/Button'

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <span className="font-semibold">Task Tracker</span>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {user?.email && <span>{user.email}</span>}
        <Button variant="logout" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </header>
  )
}
