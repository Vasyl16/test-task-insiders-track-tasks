import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CreateTaskForm } from '../../features/task/components/CreateTaskForm'
import { TASK_STATUS_LABELS, taskStatusValues } from '../../entities/task/model/task'
import { useAuth } from '../../shared/api/services/useAuth'
import { useDeleteProject, useProject } from '../../shared/api/services/useProjects'
import {
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from '../../shared/api/services/useTasks'
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
  const updateTask = useUpdateTask(workspaceId, projectId)
  const deleteTask = useDeleteTask(workspaceId, projectId)

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

  const memberEmailById = new Map(members?.map((member) => [member.user.id, member.user.email]))

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

  // The API returns newest-first; the ledger numbers a task by the order it
  // was actually logged, so entry 01 must be the oldest, not the latest.
  const loggedTasks = tasks ? [...tasks].reverse() : undefined

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

      {loggedTasks && loggedTasks.length > 0 && (
        <ul className="mt-4 divide-y divide-brass/15 rounded-2xl bg-paper shadow-lg shadow-black/20">
          {loggedTasks.map((task, index) => {
            const canManageTask = isWorkspaceOwner || task.createdBy === user?.id
            const assigneeEmail = task.assigneeId
              ? (memberEmailById.get(task.assigneeId) ?? 'Unknown')
              : null

            return (
              <li key={task.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <span className="font-mono text-sm text-ink/35 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-display text-lg text-ink ${task.status === 'DONE' ? 'line-through opacity-50' : ''}`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="truncate text-sm text-ink/60">{task.description}</p>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-ink/40">
                    {assigneeEmail ?? 'Unassigned'}
                  </p>
                </div>

                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask.mutate({
                      id: task.id,
                      status: e.target.value as (typeof taskStatusValues)[number],
                    })
                  }
                  className="shrink-0 rounded-lg border border-ink/15 bg-paper px-2 py-1 font-mono text-xs text-ink focus:border-brass focus:outline-none"
                >
                  {taskStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                {canManageTask && (
                  <button
                    type="button"
                    onClick={() => void deleteTask.mutateAsync(task.id)}
                    className="shrink-0 font-mono text-xs tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ul>
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
