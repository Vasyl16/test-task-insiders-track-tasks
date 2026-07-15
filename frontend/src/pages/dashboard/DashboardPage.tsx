import { useState } from 'react'
import { Link } from 'react-router'
import { CreateWorkspaceForm } from '../../features/workspace/components/CreateWorkspaceForm'
import { useWorkspaces } from '../../shared/api/services/useWorkspaces'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'

export function DashboardPage() {
  const { data: workspaces, isLoading } = useWorkspaces()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
            Ledger
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium text-paper">
            Your workspaces
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>New workspace</Button>
      </div>

      {isLoading && (
        <p className="mt-10 font-mono text-sm text-fog">Loading your workspaces…</p>
      )}

      {!isLoading && workspaces?.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">No workspaces yet</p>
          <p className="mt-1 text-sm text-fog">
            Open one to start logging projects against it.
          </p>
        </div>
      )}

      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {workspaces?.map((workspace) => (
          <li key={workspace.id}>
            <Link
              to={`/workspaces/${workspace.id}`}
              className="group relative block rounded-2xl bg-paper p-6 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
            >
              <span
                aria-hidden="true"
                className="absolute -top-2 left-6 h-4 w-8 rounded-b-sm bg-brass shadow-sm transition-colors group-hover:bg-brass-light"
              />
              <p className="font-display text-xl font-medium text-ink">
                {workspace.name}
              </p>
              {workspace.description && (
                <p className="mt-1.5 text-sm text-ink/60">{workspace.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {isCreateOpen && (
        <Modal title="New workspace" onClose={() => setIsCreateOpen(false)}>
          <CreateWorkspaceForm onCreated={() => setIsCreateOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
