import { Link } from 'react-router'
import { useAuth } from '../../../shared/api/services/useAuth'
import { Button } from '../../../shared/ui/Button'

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-brass/20 bg-desk">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="group flex items-baseline gap-2">
          <span className="font-display text-xl font-medium text-paper italic">
            Ledger
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-fog uppercase group-hover:text-brass-light">
            Workspaces
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/invites"
            className="font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
          >
            Invites
          </Link>
          {user?.name && (
            <span className="font-mono text-xs text-fog">{user.name}</span>
          )}
          <Button variant="nav" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
