import { Outlet, useMatches } from 'react-router'
import { AppHeader } from '../../widgets/app-header/ui/AppHeader'
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary'

export function DashboardLayout() {
  // Keyed by the matched route's *id* (stable across dynamic segments —
  // /workspaces/:workspaceId keeps the same id whichever workspace it
  // resolves to), not the resolved pathname. Keying by pathname would also
  // remount on every param change, silently defeating WorkspacePage's own
  // "don't remount, just adjust state" handling for switching between
  // workspaces. This only remounts (clearing a caught crash) when actually
  // navigating to a different page.
  const matches = useMatches()
  const routeId = matches[matches.length - 1]?.id ?? 'root'

  return (
    <div className="min-h-screen bg-desk">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorBoundary key={routeId}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
