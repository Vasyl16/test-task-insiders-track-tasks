import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useCreateWorkspace } from '../../../shared/api/services/useWorkspaces'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { workspaceSchema, type WorkspaceFormValues } from '../schemas/workspaceSchema'

interface CreateWorkspaceFormProps {
  onCreated?: () => void
}

export function CreateWorkspaceForm({ onCreated }: CreateWorkspaceFormProps) {
  const createWorkspace = useCreateWorkspace()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<WorkspaceFormValues>({ resolver: zodResolver(workspaceSchema) })

  const onSubmit = async (values: WorkspaceFormValues) => {
    try {
      await createWorkspace.mutateAsync(values)
      reset()
      onCreated?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not create workspace.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="workspace-name"
        label="Workspace name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="workspace-description"
        label="Description (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating…' : 'Create workspace'}
      </Button>
    </form>
  )
}
