import { useState } from 'react'
import type { DragEvent } from 'react'
import {
  TASK_PRIORITY_BORDER_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskStatusValues,
} from '../../../entities/task/model/task'
import type { Task, TaskStatus } from '../../../entities/task/model/task'
import type { WorkspaceMember } from '../../../entities/workspace/model/workspace-member'
import { useDeleteTask, useUpdateTask } from '../../../shared/api/services/useTasks'

interface TaskBoardProps {
  workspaceId: string
  projectId: string
  tasks: Task[]
  members: WorkspaceMember[] | undefined
  currentUserId: string | undefined
  isWorkspaceOwner: boolean
}

export function TaskBoard({
  workspaceId,
  projectId,
  tasks,
  members,
  currentUserId,
  isWorkspaceOwner,
}: TaskBoardProps) {
  const updateTask = useUpdateTask(workspaceId, projectId)
  const deleteTask = useDeleteTask(workspaceId, projectId)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const memberEmailById = new Map(members?.map((member) => [member.user.id, member.user.email]))

  // Oldest-first within each column — same "honest ledger number" reasoning
  // as the flat lists elsewhere in the app, even though these columns don't
  // show a number: newest-added still lands visually last, not first.
  const chronological = [...tasks].reverse()

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault()
    setDragOverStatus(null)
    const taskId = event.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === status) {
      return
    }
    updateTask.mutate({ id: task.id, status })
    setDraggedTaskId(null)
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {taskStatusValues.map((status) => {
        const columnTasks = chronological.filter((task) => task.status === status)

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStatus(status)
            }}
            onDragLeave={() =>
              setDragOverStatus((current) => (current === status ? null : current))
            }
            onDrop={(e) => handleDrop(e, status)}
            className={`rounded-2xl bg-desk-raised p-3 transition-shadow ${
              dragOverStatus === status ? 'ring-2 ring-brass' : ''
            }`}
          >
            <div className="flex items-center justify-between px-2 pb-3">
              <h3 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
                {TASK_STATUS_LABELS[status]}
              </h3>
              <span className="font-mono text-xs text-fog">{columnTasks.length}</span>
            </div>

            <div className="space-y-2">
              {columnTasks.length === 0 && (
                <p className="px-2 py-6 text-center font-mono text-xs text-fog">
                  Drop tasks here
                </p>
              )}

              {columnTasks.map((task) => {
                const canManage = isWorkspaceOwner || task.createdBy === currentUserId
                const assigneeEmail = task.assigneeId
                  ? (memberEmailById.get(task.assigneeId) ?? 'Unknown')
                  : null

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggedTaskId(task.id)
                    }}
                    onDragEnd={() => setDraggedTaskId(null)}
                    className={`cursor-grab space-y-1.5 rounded-xl border-t-4 bg-paper p-3 shadow-md shadow-black/20 transition-opacity active:cursor-grabbing ${TASK_PRIORITY_BORDER_CLASSES[task.priority]} ${
                      draggedTaskId === task.id ? 'opacity-40' : ''
                    }`}
                  >
                    <p
                      className={`font-display text-base leading-snug text-ink ${task.status === 'DONE' ? 'line-through opacity-50' : ''}`}
                    >
                      {task.title}
                    </p>

                    {task.description && (
                      <p className="truncate text-xs text-ink/60">{task.description}</p>
                    )}

                    <p className="font-mono text-[11px] text-ink/40">
                      {TASK_PRIORITY_LABELS[task.priority]} · {assigneeEmail ?? 'Unassigned'}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="sr-only" htmlFor={`status-${task.id}`}>
                        Status (accessible alternative to dragging)
                      </label>
                      <select
                        id={`status-${task.id}`}
                        value={task.status}
                        onChange={(e) =>
                          updateTask.mutate({
                            id: task.id,
                            status: e.target.value as TaskStatus,
                          })
                        }
                        className="rounded-md border border-ink/15 bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink focus:border-brass focus:outline-none"
                      >
                        {taskStatusValues.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => void deleteTask.mutateAsync(task.id)}
                          className="font-mono text-[11px] tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
