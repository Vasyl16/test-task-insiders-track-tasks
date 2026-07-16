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
import { Select } from '../../../shared/ui/Select'
import { taskSchema, type TaskFormValues } from '../schemas/taskSchema'

const priorityOptions = taskPriorityValues.map((priority) => ({
  value: priority,
  label: TASK_PRIORITY_LABELS[priority],
  dotClassName: TASK_PRIORITY_DOT_CLASSES[priority],
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
    ...(members?.map((member) => ({ value: member.user.id, label: member.user.email })) ?? []),
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
    },
  })

  const onSubmit = async ({
    title,
    description,
    status,
    priority,
    assigneeId,
  }: TaskFormValues) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description,
        status,
        priority,
        assigneeId: assigneeId || null,
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

      <Select
        id="edit-task-status"
        label="Status"
        error={errors.status?.message}
        {...register('status')}
      >
        {taskStatusValues.map((status) => (
          <option key={status} value={status}>
            {TASK_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>

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

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
