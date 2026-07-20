import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { Task } from '../../../entities/task/model/task'
import {
  TASK_PRIORITY_DOT_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskPriorityValues,
  taskStatusValues,
} from '../../../entities/task/model/task'
import type { WorkspaceMember } from '../../../entities/workspace/model/workspace-member'
import { useUpdateTask } from '../../../shared/api/services/useTasks'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { Listbox } from '../../../shared/ui/Listbox'
import { taskSchema, type TaskFormValues } from '../schemas/taskSchema'

const priorityOptions = taskPriorityValues.map((priority) => ({
  value: priority,
  label: TASK_PRIORITY_LABELS[priority],
  dotClassName: TASK_PRIORITY_DOT_CLASSES[priority],
}))

const statusOptions = taskStatusValues.map((status) => ({
  value: status,
  label: TASK_STATUS_LABELS[status],
}))

const UNASSIGNED_OPTION = { value: '', label: 'Unassigned' }

interface EditTaskFormProps {
  workspaceId: string
  projectId: string
  task: Task
  members: WorkspaceMember[] | undefined
  onSaved?: () => void
}

export function EditTaskForm({
  workspaceId,
  projectId,
  task,
  members,
  onSaved,
}: EditTaskFormProps) {
  const updateTask = useUpdateTask(workspaceId, projectId)
  const assigneeOptions = [
    UNASSIGNED_OPTION,
    ...(members?.map((member) => ({ value: member.user.id, label: member.user.name })) ?? []),
  ]
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? '',
      // ISO strings always start with YYYY-MM-DD, which is exactly what
      // <input type="date"> expects — no date library needed for this slice.
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    },
  })

  const onSubmit = async ({
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
  }: TaskFormValues) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      })
      onSaved?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not save task.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="edit-task-title"
        label="Task title"
        autoFocus
        error={errors.title?.message}
        {...register('title')}
      />

      <Input
        id="edit-task-description"
        label="Description (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <Listbox
            id="edit-task-status"
            label="Status"
            value={field.value}
            onChange={field.onChange}
            options={statusOptions}
            error={errors.status?.message}
          />
        )}
      />

      <Controller
        name="priority"
        control={control}
        render={({ field }) => (
          <Listbox
            id="edit-task-priority"
            label="Priority"
            value={field.value}
            onChange={field.onChange}
            options={priorityOptions}
            error={errors.priority?.message}
          />
        )}
      />

      <Controller
        name="assigneeId"
        control={control}
        render={({ field }) => (
          <Listbox
            id="edit-task-assignee"
            label="Assignee (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            options={assigneeOptions}
            error={errors.assigneeId?.message}
          />
        )}
      />

      <Input
        id="edit-task-due-date"
        label="Due date (optional)"
        type="date"
        error={errors.dueDate?.message}
        {...register('dueDate')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
