import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import {
  TASK_PRIORITY_DOT_CLASSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskPriorityValues,
  taskStatusValues,
} from '../../../entities/task/model/task'
import { useWorkspaceMembers } from '../../../shared/api/services/useWorkspaces'
import { useCreateTask } from '../../../shared/api/services/useTasks'
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

interface CreateTaskFormProps {
  workspaceId: string
  projectId: string
  onCreated?: () => void
}

export function CreateTaskForm({ workspaceId, projectId, onCreated }: CreateTaskFormProps) {
  const createTask = useCreateTask(workspaceId, projectId)
  // The assignee picker needs every member, not one page of them - 100 is
  // this app's existing max page size ceiling everywhere else, and a
  // realistic upper bound for a workspace's member count.
  const { data: membersPage } = useWorkspaceMembers(workspaceId, { page: 1, limit: 100 })
  const assigneeOptions = [
    UNASSIGNED_OPTION,
    ...(membersPage?.items.map((member) => ({ value: member.user.id, label: member.user.name })) ?? []),
  ]
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: 'TODO', priority: 'MEDIUM', assigneeId: '', dueDate: '' },
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
      await createTask.mutateAsync({
        title,
        description,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      })
      reset({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
      onCreated?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not create task.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="task-title"
        label="Task title"
        autoFocus
        error={errors.title?.message}
        {...register('title')}
      />

      <Input
        id="task-description"
        label="Description (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <Listbox
            id="task-status"
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
            id="task-priority"
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
            id="task-assignee"
            label="Assignee (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            options={assigneeOptions}
            error={errors.assigneeId?.message}
          />
        )}
      />

      <Input
        id="task-due-date"
        label="Due date (optional)"
        type="date"
        error={errors.dueDate?.message}
        {...register('dueDate')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Logging…' : 'Log task'}
      </Button>
    </form>
  )
}
