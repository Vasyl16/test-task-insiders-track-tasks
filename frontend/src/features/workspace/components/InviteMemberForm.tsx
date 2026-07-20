import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useCreateInvite } from '../../../shared/api/services/useInvites'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { inviteMemberSchema, type InviteMemberFormValues } from '../schemas/inviteMemberSchema'

interface InviteMemberFormProps {
  workspaceId: string
  onSent?: () => void
}

export function InviteMemberForm({ workspaceId, onSent }: InviteMemberFormProps) {
  const createInvite = useCreateInvite(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<InviteMemberFormValues>({ resolver: zodResolver(inviteMemberSchema) })

  const onSubmit = async ({ email }: InviteMemberFormValues) => {
    try {
      await createInvite.mutateAsync(email)
      reset()
      onSent?.()
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not send invite.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <Input
        id="invite-email"
        label="Email address"
        type="email"
        autoFocus
        placeholder="teammate@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  )
}
