import { RouterProvider } from 'react-router'
import { ErrorBoundary } from '../shared/ui/ErrorBoundary'
import { QueryProvider } from './providers/QueryProvider'
import { router } from './routes/router'

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
