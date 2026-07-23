import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createComment,
  deleteComment,
  getCommentsPage,
  updateComment,
  type CommentPayload,
} from '../queries/comment'
import { queryKeys } from '../queryKeys'

// Matches the backend's default page size (@Min(1) @Max(100), default 20) —
// comments load oldest-first (unchanged reading order), "Load more" appends
// the next chronological batch at the bottom.
const COMMENTS_PAGE_SIZE = 20

export function useComments(workspaceId: string, projectId: string, taskId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.comments(workspaceId, projectId, taskId),
    queryFn: ({ pageParam }) =>
      getCommentsPage(workspaceId, projectId, taskId, {
        cursor: pageParam,
        limit: COMMENTS_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
