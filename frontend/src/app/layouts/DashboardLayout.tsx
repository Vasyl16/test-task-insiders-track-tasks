import { Outlet } from 'react-router'
import { AppHeader } from '../../widgets/app-header/ui/AppHeader'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-desk">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
