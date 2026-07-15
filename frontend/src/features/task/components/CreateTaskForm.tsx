import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TASK_STATUS_LABELS, taskStatusValues } from '../../../entities/task/model/task'
import { useWorkspaceMembers } from '../../../shared/api/services/useWorkspaces'
import { useCreateTask } from '../../../shared/api/services/useTasks'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { taskSchema, type TaskFormValues } from '../schemas/taskSchema'

interface CreateTaskFormProps {
  workspaceId: string
  projectId: string
  onCreated?: () => void
}

export function CreateTaskForm({ workspaceId, projectId, onCreated }: CreateTaskFormProps) {
  const createTask = useCreateTask(workspaceId, projectId)
  const { data: members } = useWorkspaceMembers(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: 'TODO', assigneeId: '' },
  })

  const onSubmit = async ({ title, description, status, assigneeId }: TaskFormValues) => {
    try {
      await createTask.mutateAsync({
        title,
        description,
        status,
        assigneeId: assigneeId || null,
      })
      reset({ title: '', description: '', status: 'TODO', assigneeId: '' })
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

      <Select id="task-status" label="Status" error={errors.status?.message} {...register('status')}>
        {taskStatusValues.map((status) => (
          <option key={status} value={status}>
            {TASK_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>

      <Select
        id="task-assignee"
        label="Assignee (optional)"
        error={errors.assigneeId?.message}
        {...register('assigneeId')}
      >
        <option value="">Unassigned</option>
        {members?.map((member) => (
          <option key={member.user.id} value={member.user.id}>
            {member.user.email}
          </option>
        ))}
      </Select>

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Logging…' : 'Log task'}
      </Button>
    </form>
  )
}
