import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EditProjectForm } from '../../features/project/components/EditProjectForm'
import { CreateTaskForm } from '../../features/task/components/CreateTaskForm'
import { TaskBoard } from '../../widgets/task-board/ui/TaskBoard'
import { useAuth } from '../../shared/api/services/useAuth'
import { useDeleteProject, useProject } from '../../shared/api/services/useProjects'
import { useWorkspace, useWorkspaceMembers } from '../../shared/api/services/useWorkspaces'
import { getErrorMessage, isNotFoundOrForbidden } from '../../shared/lib/getErrorMessage'
import { Button } from '../../shared/ui/Button'
import { ErrorState } from '../../shared/ui/ErrorState'
import { Modal } from '../../shared/ui/Modal'
import { Spinner } from '../../shared/ui/Spinner'

export function ProjectPage() {
  const { workspaceId = '', projectId = '' } = useParams<{
    workspaceId: string
    projectId: string
  }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: workspace } = useWorkspace(workspaceId)
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useProject(workspaceId, projectId)
  const { data: members } = useWorkspaceMembers(workspaceId)

  const deleteProject = useDeleteProject(workspaceId)

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)

  const BackLink = (
    <Link
      to={`/workspaces/${workspaceId}`}
      className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
    >
      <span aria-hidden="true" className="-translate-y-px">
        ←
      </span>
      <span>Back to {workspace?.name ?? 'workspace'}</span>
    </Link>
  )

  if (isProjectLoading) {
    return (
      <div>
        {BackLink}
        <div className="mt-10 flex justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (isProjectError && !isNotFoundOrForbidden(projectError)) {
    return (
      <div>
        {BackLink}
        <ErrorState
          message={getErrorMessage(projectError, 'Failed to load this project.')}
          onRetry={() => void refetchProject()}
        />
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        {BackLink}
        <p className="mt-6 font-mono text-sm text-fog">
          This project doesn&apos;t exist, or you no longer have access to it.
        </p>
      </div>
    )
  }

  const isWorkspaceOwner = workspace?.ownerId === user?.id
  const canManageProject = isWorkspaceOwner || project.createdBy === user?.id

  const handleDeleteProject = () => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      return
    }
    // Navigate first, then fire the mutation — see WorkspacePage for why.
    void navigate(`/workspaces/${workspaceId}`)
    deleteProject.mutate(project.id)
  }

  return (
    <div>
      {BackLink}

      <div className="mt-4 flex items-start justify-between gap-6 border-b border-brass/20 pb-8">
        <div>
          <h1 className="font-display text-3xl font-medium text-paper">{project.name}</h1>
          {project.description && (
            <p className="mt-1.5 text-sm text-fog">{project.description}</p>
          )}
        </div>
        {canManageProject && (
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="nav" onClick={() => setIsEditProjectOpen(true)}>
              Edit project
            </Button>
            <Button variant="logout" onClick={handleDeleteProject}>
              Delete project
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
          Tasks logged
        </h2>
        <Button onClick={() => setIsCreateTaskOpen(true)}>New task</Button>
      </div>

      {/* Each Kanban column fetches, filters, and lazily paginates its own
          status — there's no project-wide "all tasks" fetch to gate this on. */}
      <TaskBoard
        workspaceId={workspaceId}
        projectId={projectId}
        members={members}
        currentUserId={user?.id}
        isWorkspaceOwner={isWorkspaceOwner}
      />

      {isCreateTaskOpen && (
        <Modal title="New task" onClose={() => setIsCreateTaskOpen(false)}>
          <CreateTaskForm
            workspaceId={workspaceId}
            projectId={projectId}
            onCreated={() => setIsCreateTaskOpen(false)}
          />
        </Modal>
      )}

      {isEditProjectOpen && (
        <Modal title="Edit project" onClose={() => setIsEditProjectOpen(false)}>
          <EditProjectForm
            workspaceId={workspaceId}
            project={project}
            onSaved={() => setIsEditProjectOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
