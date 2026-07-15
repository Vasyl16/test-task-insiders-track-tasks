import { RouterProvider } from 'react-router'
import { QueryProvider } from './providers/QueryProvider'
import { router } from './routes/router'

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}

export default App
