import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CreateTaskForm } from '../../features/task/components/CreateTaskForm'
import { TaskBoard } from '../../widgets/task-board/ui/TaskBoard'
import { useAuth } from '../../shared/api/services/useAuth'
import { useTasks } from '../../shared/api/services/useTasks'
import { useDeleteProject, useProject } from '../../shared/api/services/useProjects'
import { useWorkspace, useWorkspaceMembers } from '../../shared/api/services/useWorkspaces'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'

export function ProjectPage() {
  const { workspaceId = '', projectId = '' } = useParams<{
    workspaceId: string
    projectId: string
  }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: workspace } = useWorkspace(workspaceId)
  const { data: project, isLoading: isProjectLoading } = useProject(workspaceId, projectId)
  const { data: tasks, isLoading: isTasksLoading } = useTasks(workspaceId, projectId)
  const { data: members } = useWorkspaceMembers(workspaceId)

  const deleteProject = useDeleteProject(workspaceId)

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

  const BackLink = (
    <Link
      to={`/workspaces/${workspaceId}`}
      className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
    >
      ← Back to {workspace?.name ?? 'workspace'}
    </Link>
  )

  if (isProjectLoading) {
    return (
      <div>
        {BackLink}
        <p className="mt-6 font-mono text-sm text-fog">Loading…</p>
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
          <Button variant="logout" onClick={handleDeleteProject} className="shrink-0">
            Delete project
          </Button>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
          Tasks logged
        </h2>
        <Button onClick={() => setIsCreateTaskOpen(true)}>New task</Button>
      </div>

      {isTasksLoading && <p className="mt-6 font-mono text-sm text-fog">Loading tasks…</p>}

      {!isTasksLoading && tasks?.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">No tasks yet</p>
          <p className="mt-1 text-sm text-fog">Log the first one for this project.</p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <TaskBoard
          workspaceId={workspaceId}
          projectId={projectId}
          tasks={tasks}
          members={members}
          currentUserId={user?.id}
          isWorkspaceOwner={isWorkspaceOwner}
        />
      )}

      {isCreateTaskOpen && (
        <Modal title="New task" onClose={() => setIsCreateTaskOpen(false)}>
          <CreateTaskForm
            workspaceId={workspaceId}
            projectId={projectId}
            onCreated={() => setIsCreateTaskOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
