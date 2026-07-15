import { Outlet } from 'react-router'
import { AppHeader } from '../../widgets/app-header/ui/AppHeader'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
