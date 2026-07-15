import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CreateProjectForm } from '../../features/project/components/CreateProjectForm'
import { useAuth } from '../../shared/api/services/useAuth'
import { useDeleteProject, useProjects } from '../../shared/api/services/useProjects'
import { useDeleteWorkspace, useWorkspace } from '../../shared/api/services/useWorkspaces'
import { Button } from '../../shared/ui/Button'

export function WorkspacePage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(workspaceId)
  const { data: projects, isLoading: isProjectsLoading } = useProjects(workspaceId)
  const deleteWorkspace = useDeleteWorkspace()
  const deleteProject = useDeleteProject(workspaceId)

  const [showCreateProject, setShowCreateProject] = useState(false)

  if (isWorkspaceLoading) {
    return <p className="text-sm text-gray-600">Loading…</p>
  }

  if (!workspace) {
    return <p className="text-sm text-gray-600">Workspace not found.</p>
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-gray-600">{workspace.description}</p>
          )}
        </div>
        {isOwner && (
          <Button variant="logout" onClick={handleDeleteWorkspace}>
            Delete workspace
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Projects</h2>
        <Button onClick={() => setShowCreateProject((prev) => !prev)}>
          {showCreateProject ? 'Cancel' : 'New project'}
        </Button>
      </div>

      {showCreateProject && (
        <div className="max-w-sm rounded-lg border border-gray-200 bg-white p-4">
          <CreateProjectForm
            workspaceId={workspace.id}
            onCreated={() => setShowCreateProject(false)}
          />
        </div>
      )}

      {isProjectsLoading && <p className="text-sm text-gray-600">Loading projects…</p>}

      {!isProjectsLoading && projects?.length === 0 && (
        <p className="text-sm text-gray-600">No projects yet.</p>
      )}

      <ul className="space-y-2">
        {projects?.map((project) => {
          const canManage = isOwner || project.createdBy === user?.id
          return (
            <li
              key={project.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{project.name}</p>
                {project.description && (
                  <p className="text-sm text-gray-600">{project.description}</p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="logout"
                  onClick={() => void deleteProject.mutateAsync(project.id)}
                >
                  Delete
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
