import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Comment } from '../../../entities/comment/model/comment'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../../../shared/api/services/useComments'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { FormError } from '../../../shared/ui/FormError'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Spinner } from '../../../shared/ui/Spinner'
import { Textarea } from '../../../shared/ui/Textarea'
import { commentSchema, type CommentFormValues } from '../schemas/commentSchema'

interface CommentSectionProps {
  workspaceId: string
  projectId: string
  taskId: string
  currentUserId: string | undefined
  isWorkspaceOwner: boolean
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function CommentSection({
  workspaceId,
  projectId,
  taskId,
  currentUserId,
  isWorkspaceOwner,
}: CommentSectionProps) {
  const {
    data: comments,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useComments(workspaceId, projectId, taskId)
  const createComment = useCreateComment(workspaceId, projectId, taskId)
  const updateComment = useUpdateComment(workspaceId, projectId, taskId)
  const deleteComment = useDeleteComment(workspaceId, projectId, taskId)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CommentFormValues>({ resolver: zodResolver(commentSchema) })

  const onSubmit = async ({ content }: CommentFormValues) => {
    try {
      await createComment.mutateAsync({ content })
      reset({ content: '' })
    } catch (submitError) {
      setError('root', {
        message: getErrorMessage(submitError, 'Could not post comment.'),
      })
    }
  }

  return (
    <div>
      <h3 className="font-mono text-xs tracking-[0.2em] text-brass-deep uppercase">Comments</h3>

      <div className="mt-3 space-y-3">
        {(isLoading || isFetching) &&
          Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-1.5 rounded-lg bg-ink/5 p-3">
              <Skeleton className="h-3 w-1/3 bg-ink/10" />
              <Skeleton className="h-3.5 w-4/5 bg-ink/10" />
            </div>
          ))}

        {isError && !isFetching && (
          <ErrorState
            message={getErrorMessage(error, 'Failed to load comments.')}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isFetching && !isError && comments?.length === 0 && (
          <p className="font-mono text-xs text-ink/50">No comments yet.</p>
        )}

        {!isLoading &&
          !isFetching &&
          !isError &&
          comments?.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canManage={isWorkspaceOwner || comment.author.id === currentUserId}
              isEditing={editingId === comment.id}
              onStartEdit={() => setEditingId(comment.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={async (content) => {
                await updateComment.mutateAsync({ id: comment.id, content })
                setEditingId(null)
              }}
              onRemove={() => void deleteComment.mutateAsync(comment.id)}
            />
          ))}
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-4" noValidate>
        <Textarea
          id="new-comment"
          label="Add a comment"
          placeholder="Write a comment…"
          error={errors.content?.message}
          {...register('content')}
        />
        <FormError message={errors.root?.message} />
        <Button type="submit" disabled={isSubmitting} variant="nav" className="mt-2">
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </Button>
      </form>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  canManage: boolean
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (content: string) => Promise<void>
  onRemove: () => void
}

function CommentItem({
  comment,
  canManage,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: CommentItemProps) {
  const [draft, setDraft] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const trimmedDraft = draft.trim()
  const isUnchanged = trimmedDraft === comment.content.trim()

  if (isEditing) {
    return (
      <div className="rounded-lg bg-ink/5 p-3">
        <Textarea
          id={`edit-comment-${comment.id}`}
          label="Edit comment"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="nav"
            disabled={isSaving || trimmedDraft.length === 0 || isUnchanged}
            onClick={async () => {
              setIsSaving(true)
              try {
                await onSave(trimmedDraft)
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {isSaving ? <Spinner size="sm" /> : 'Save'}
          </Button>
          <Button variant="nav" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-ink/5 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] text-ink/50">
          {comment.author.name} · {formatTimestamp(comment.createdAt)}
          {comment.createdAt !== comment.updatedAt && ' (edited)'}
        </p>
        {canManage && (
          <div className="flex shrink-0 gap-2 font-mono text-[11px] tracking-wide uppercase">
            <button
              type="button"
              onClick={onStartEdit}
              className="text-brass-deep transition-colors hover:text-brass"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-oxblood/70 transition-colors hover:text-oxblood"
            >
              Remove
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{comment.content}</p>
    </div>
  )
}
