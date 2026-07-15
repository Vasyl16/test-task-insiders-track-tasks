import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useCreateProject } from '../../../shared/api/services/useProjects'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { projectSchema, type ProjectFormValues } from '../schemas/projectSchema'

interface CreateProjectFormProps {
  workspaceId: string
  onCreated?: () => void
}

export function CreateProjectForm({ workspaceId, onCreated }: CreateProjectFormProps) {
  const createProject = useCreateProject(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema) })

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await createProject.mutateAsync(values)
      reset()
      onCreated?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not create project.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="project-name"
        label="Project name"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="project-description"
        label="Description (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create project'}
      </Button>
    </form>
  )
}
