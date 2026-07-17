import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
  type CommentPayload,
} from '../queries/comment'
import { queryKeys } from '../queryKeys'

export function useComments(workspaceId: string, projectId: string, taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.comments(workspaceId, projectId, taskId),
    queryFn: () => getComments(workspaceId, projectId, taskId),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(taskId),
  })
}

export function useCreateComment(workspaceId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CommentPayload) =>
      createComment(workspaceId, projectId, taskId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.comments(workspaceId, projectId, taskId),
      })
    },
  })
}

// Takes `id` per-call, like useUpdateTask/useDeleteTask, so one hook
// instance can act on any comment in the list without a hook-per-comment.
export function useUpdateComment(workspaceId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { id: string } & CommentPayload) =>
      updateComment(workspaceId, projectId, taskId, vars.id, { content: vars.content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.comments(workspaceId, projectId, taskId),
      })
    },
  })
}

export function useDeleteComment(workspaceId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteComment(workspaceId, projectId, taskId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.comments(workspaceId, projectId, taskId),
      })
    },
  })
}
