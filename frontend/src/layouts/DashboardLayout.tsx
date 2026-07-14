import { Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

export function DashboardLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <span className="font-semibold">Task Tracker</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {user?.email && <span>{user.email}</span>}
          <button type="button" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
