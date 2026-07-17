export const taskStatusValues = ['TODO', 'IN_PROGRESS', 'DONE'] as const
export type TaskStatus = (typeof taskStatusValues)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
}

export const taskPriorityValues = ['LOW', 'MEDIUM', 'HIGH'] as const
export type TaskPriority = (typeof taskPriorityValues)[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

// Traffic-light semantics — a scannable signal, not a brand accent. Applied
// as Tailwind utility classes (e.g. `bg-${TASK_PRIORITY_DOT_COLOR.LOW}`
// won't work with dynamic interpolation, so consumers use this map directly
// as a lookup, not string-templated).
export const TASK_PRIORITY_DOT_CLASSES: Record<TaskPriority, string> = {
  LOW: 'bg-moss',
  MEDIUM: 'bg-brass',
  HIGH: 'bg-oxblood',
}

// Same colors, as a top-border utility — used on the Kanban card itself
// instead of a dot indicator.
export const TASK_PRIORITY_BORDER_CLASSES: Record<TaskPriority, string> = {
  LOW: 'border-t-moss',
  MEDIUM: 'border-t-brass',
  HIGH: 'border-t-oxblood',
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

// One entry per status change, written automatically by the backend — never
// created directly, so there's no corresponding payload/create type.
export interface TaskHistoryEntry {
  id: string
  taskId: string
  oldStatus: TaskStatus
  newStatus: TaskStatus
  changedAt: string
  changedBy: {
    id: string
    email: string
    name: string
  }
}
