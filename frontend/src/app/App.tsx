import { RouterProvider } from 'react-router'
import { ErrorBoundary } from '../shared/ui/ErrorBoundary'
import { QueryProvider } from './providers/QueryProvider'
import { RealtimeConnectionManager } from './providers/RealtimeConnectionManager'
import { router } from './routes/router'

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <RealtimeConnectionManager />
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
