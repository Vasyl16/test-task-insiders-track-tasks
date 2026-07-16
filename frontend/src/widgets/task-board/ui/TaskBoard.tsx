import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { EditTaskForm } from '../../../features/task/components/EditTaskForm'
import {
  TASK_PRIORITY_BORDER_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskStatusValues,
} from '../../../entities/task/model/task'
import type { Task, TaskStatus } from '../../../entities/task/model/task'
import type { WorkspaceMember } from '../../../entities/workspace/model/workspace-member'
import { useDeleteTask, useUpdateTask } from '../../../shared/api/services/useTasks'
import { Modal } from '../../../shared/ui/Modal'

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
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  // The only state DnD Kit itself needs: which task is being dragged, so
  // <DragOverlay> knows what to render. Everything else (per-card "am I the
  // one being dragged" opacity, per-column "is something hovering over me"
  // highlight) comes straight from useDraggable/useDroppable's own return
  // values — no parallel state to keep in sync with the library's.
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const memberEmailById = new Map(members?.map((member) => [member.user.id, member.user.email]))

  // Oldest-first within each column — same "honest ledger number" reasoning
  // as the flat lists elsewhere in the app, even though these columns don't
  // show a number: newest-added still lands visually last, not first.
  const chronological = [...tasks].reverse()

  const sensors = useSensors(
    // A small movement threshold before a drag "activates" — without it, a
    // plain click on the card (e.g. to reach Edit/Remove) would immediately
    // register as a drag attempt on pointerdown.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const resolveAssigneeEmail = (task: Task) =>
    task.assigneeId ? (memberEmailById.get(task.assigneeId) ?? 'Unknown') : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) {
      return
    }
    const destinationStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === destinationStatus) {
      return
    }
    updateTask.mutate({ id: task.id, status: destinationStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {taskStatusValues.map((status) => {
          const columnTasks = chronological.filter((task) => task.status === status)

          return (
            <TaskColumn key={status} status={status} taskCount={columnTasks.length}>
              {columnTasks.length === 0 && (
                <p className="px-2 py-6 text-center font-mono text-xs text-fog">
                  Drop tasks here
                </p>
              )}

              {columnTasks.map((task) => {
                const canManage = isWorkspaceOwner || task.createdBy === currentUserId

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assigneeEmail={resolveAssigneeEmail(task)}
                    canManage={canManage}
                    onEdit={() => setEditingTask(task)}
                    onRemove={() => void deleteTask.mutateAsync(task.id)}
                  />
                )
              })}
            </TaskColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div
            className={`rounded-xl border-t-4 bg-paper p-3 shadow-xl shadow-black/30 ${TASK_PRIORITY_BORDER_CLASSES[activeTask.priority]}`}
          >
            <TaskCardContent task={activeTask} assigneeEmail={resolveAssigneeEmail(activeTask)} />
          </div>
        )}
      </DragOverlay>

      {editingTask && (
        <Modal title="Edit task" onClose={() => setEditingTask(null)}>
          <EditTaskForm
            workspaceId={workspaceId}
            projectId={projectId}
            task={editingTask}
            members={members}
            onSaved={() => setEditingTask(null)}
          />
        </Modal>
      )}
    </DndContext>
  )
}

interface TaskColumnProps {
  status: TaskStatus
  taskCount: number
  children: ReactNode
}

function TaskColumn({ status, taskCount, children }: TaskColumnProps) {
  // The droppable id *is* the destination status — handleDragEnd reads
  // `over.id` straight back as a TaskStatus, no separate lookup table.
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl bg-desk-raised p-3 transition-shadow ${
        isOver ? 'ring-2 ring-brass' : ''
      }`}
    >
      <div className="flex items-center justify-between px-2 pb-3">
        <h3 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <span className="font-mono text-xs text-fog">{taskCount}</span>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  assigneeEmail: string | null
  canManage: boolean
  onEdit: () => void
  onRemove: () => void
}

function TaskCard({ task, assigneeEmail, canManage, onEdit, onRemove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // touch-none: without it, a touchscreen drag also tries to scroll the
      // page underneath it — PointerSensor needs the browser to hand touch
      // gestures over to it instead.
      className={`cursor-grab touch-none space-y-1.5 rounded-xl border-t-4 bg-paper p-3 shadow-md shadow-black/20 transition-opacity active:cursor-grabbing ${TASK_PRIORITY_BORDER_CLASSES[task.priority]} ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardContent task={task} assigneeEmail={assigneeEmail} />

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onEdit}
          className="font-mono text-[11px] tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
        >
          Edit
        </button>

        {canManage && (
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-[11px] tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

interface TaskCardContentProps {
  task: Task
  assigneeEmail: string | null
}

// Shared between the in-column TaskCard and the DragOverlay's floating clone
// so the two visuals can't drift apart.
function TaskCardContent({ task, assigneeEmail }: TaskCardContentProps) {
  return (
    <>
      <p
        className={`font-display text-base leading-snug text-ink ${task.status === 'DONE' ? 'line-through opacity-50' : ''}`}
      >
        {task.title}
      </p>

      {task.description && <p className="truncate text-xs text-ink/60">{task.description}</p>}

      <p className="font-mono text-[11px] text-ink/40">
        {TASK_PRIORITY_LABELS[task.priority]} · {assigneeEmail ?? 'Unassigned'}
      </p>
    </>
  )
}
