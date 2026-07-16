import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Project } from '../../entities/project/model/project'
import { CreateProjectForm } from '../../features/project/components/CreateProjectForm'
import { EditProjectForm } from '../../features/project/components/EditProjectForm'
import { EditWorkspaceForm } from '../../features/workspace/components/EditWorkspaceForm'
import { useAuth } from '../../shared/api/services/useAuth'
import { useDeleteProject, useProjects } from '../../shared/api/services/useProjects'
import { useDeleteWorkspace, useWorkspace } from '../../shared/api/services/useWorkspaces'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'

export function WorkspacePage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(workspaceId)
  const { data: projects, isLoading: isProjectsLoading } = useProjects(workspaceId)
  const deleteWorkspace = useDeleteWorkspace()
  const deleteProject = useDeleteProject(workspaceId)

  // The API returns newest-first; the ledger numbers a project by the order
  // it was actually logged, so entry 01 must be the oldest, not the latest.
  const loggedProjects = projects ? [...projects].reverse() : undefined

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const BackLink = (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
    >
      <span aria-hidden="true" className="-translate-y-px">
        ←
      </span>
      <span>All workspaces</span>
    </Link>
  )

  if (isWorkspaceLoading) {
    return (
      <div>
        {BackLink}
        <p className="mt-6 font-mono text-sm text-fog">Loading…</p>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div>
        {BackLink}
        <p className="mt-6 font-mono text-sm text-fog">
          This workspace doesn&apos;t exist, or you no longer have access to it.
        </p>
      </div>
    )
  }

  const isOwner = workspace.ownerId === user?.id

  const handleDeleteWorkspace = () => {
    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
      return
    }
    // Navigate first, then fire the mutation: this page's own useWorkspace/
    // useProjects queries must unmount before the mutation's onSuccess
    // invalidates/removes them, otherwise they'd refetch a workspace that's
    // already gone and log a pointless 404.
    void navigate('/dashboard')
    deleteWorkspace.mutate(workspace.id)
  }

  return (
    <div>
      {BackLink}

      <div className="mt-4 flex items-start justify-between gap-6 border-b border-brass/20 pb-8">
        <div>
          <h1 className="font-display text-3xl font-medium text-paper">
            {workspace.name}
          </h1>
          {workspace.description && (
            <p className="mt-1.5 text-sm text-fog">{workspace.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="nav" onClick={() => setIsEditWorkspaceOpen(true)}>
              Edit workspace
            </Button>
            <Button variant="logout" onClick={handleDeleteWorkspace}>
              Delete workspace
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
          Projects logged
        </h2>
        <Button onClick={() => setIsCreateProjectOpen(true)}>New project</Button>
      </div>

      {isProjectsLoading && (
        <p className="mt-6 font-mono text-sm text-fog">Loading projects…</p>
      )}

      {!isProjectsLoading && projects?.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">No projects yet</p>
          <p className="mt-1 text-sm text-fog">Log the first one for this workspace.</p>
        </div>
      )}

      {loggedProjects && loggedProjects.length > 0 && (
        <ul className="mt-4 divide-y divide-brass/15 rounded-2xl bg-paper shadow-lg shadow-black/20">
          {loggedProjects.map((project, index) => {
            const canManage = isOwner || project.createdBy === user?.id
            return (
              <li key={project.id} className="flex items-center gap-4 px-6 py-4">
                <span className="font-mono text-sm text-ink/35 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Link
                  to={`/workspaces/${workspaceId}/projects/${project.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-display text-lg text-ink hover:text-brass-deep">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="truncate text-sm text-ink/60">
                      {project.description}
                    </p>
                  )}
                </Link>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProject(project)}
                      className="font-mono text-xs tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProject.mutateAsync(project.id)}
                      className="font-mono text-xs tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {isCreateProjectOpen && (
        <Modal title="New project" onClose={() => setIsCreateProjectOpen(false)}>
          <CreateProjectForm
            workspaceId={workspace.id}
            onCreated={() => setIsCreateProjectOpen(false)}
          />
        </Modal>
      )}

      {isEditWorkspaceOpen && (
        <Modal title="Edit workspace" onClose={() => setIsEditWorkspaceOpen(false)}>
          <EditWorkspaceForm
            workspace={workspace}
            onSaved={() => setIsEditWorkspaceOpen(false)}
          />
        </Modal>
      )}

      {editingProject && (
        <Modal title="Edit project" onClose={() => setEditingProject(null)}>
          <EditProjectForm
            workspaceId={workspaceId}
            project={editingProject}
            onSaved={() => setEditingProject(null)}
          />
        </Modal>
      )}
    </div>
  )
}
