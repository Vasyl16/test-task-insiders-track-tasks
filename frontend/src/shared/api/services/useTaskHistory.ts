import { useInfiniteQuery } from '@tanstack/react-query'
import { getTaskHistoryPage } from '../queries/taskHistory'
import { queryKeys } from '../queryKeys'

// Matches the backend's default page size (@Min(1) @Max(100), default 20).
const HISTORY_PAGE_SIZE = 20

export function useTaskHistory(workspaceId: string, projectId: string, taskId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.history(workspaceId, projectId, taskId),
    queryFn: ({ pageParam }) =>
      getTaskHistoryPage(workspaceId, projectId, taskId, {
        cursor: pageParam,
        limit: HISTORY_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(taskId),
  })
}
