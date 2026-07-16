import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Workspace } from '../../../entities/workspace/model/workspace'
import { useUpdateWorkspace } from '../../../shared/api/services/useWorkspaces'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { workspaceSchema, type WorkspaceFormValues } from '../schemas/workspaceSchema'

interface EditWorkspaceFormProps {
  workspace: Workspace
  onSaved?: () => void
}

export function EditWorkspaceForm({ workspace, onSaved }: EditWorkspaceFormProps) {
  const updateWorkspace = useUpdateWorkspace(workspace.id)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description ?? '',
    },
  })

  const onSubmit = async (values: WorkspaceFormValues) => {
    try {
      await updateWorkspace.mutateAsync(values)
      onSaved?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not save workspace.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="edit-workspace-name"
        label="Workspace name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="edit-workspace-description"
        label="Description (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
