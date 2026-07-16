import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Project } from '../../../entities/project/model/project'
import { useUpdateProject } from '../../../shared/api/services/useProjects'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { projectSchema, type ProjectFormValues } from '../schemas/projectSchema'

interface EditProjectFormProps {
  workspaceId: string
  project: Project
  onSaved?: () => void
}

export function EditProjectForm({ workspaceId, project, onSaved }: EditProjectFormProps) {
  const updateProject = useUpdateProject(workspaceId, project.id)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
    },
  })

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync(values)
      onSaved?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not save project.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="edit-project-name"
        label="Project name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="edit-project-description"
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
