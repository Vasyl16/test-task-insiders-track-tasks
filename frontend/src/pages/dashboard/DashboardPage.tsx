import { useState } from 'react'
import { Link } from 'react-router'
import { CreateWorkspaceForm } from '../../features/workspace/components/CreateWorkspaceForm'
import { useWorkspaces } from '../../shared/api/services/useWorkspaces'
import { Button } from '../../shared/ui/Button'

export function DashboardPage() {
  const { data: workspaces, isLoading } = useWorkspaces()
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Workspaces</h1>
        <Button onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? 'Cancel' : 'New workspace'}
        </Button>
      </div>

      {showCreateForm && (
        <div className="max-w-sm rounded-lg border border-gray-200 bg-white p-4">
          <CreateWorkspaceForm onCreated={() => setShowCreateForm(false)} />
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && workspaces?.length === 0 && (
        <p className="text-sm text-gray-600">You don&apos;t have any workspaces yet.</p>
      )}

      <ul className="space-y-2">
        {workspaces?.map((workspace) => (
          <li key={workspace.id}>
            <Link
              to={`/workspaces/${workspace.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
            >
              <p className="font-medium">{workspace.name}</p>
              {workspace.description && (
                <p className="text-sm text-gray-600">{workspace.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
