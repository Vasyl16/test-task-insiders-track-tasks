import { useQuery } from '@tanstack/react-query'
import { getTaskHistory } from '../queries/taskHistory'
import { queryKeys } from '../queryKeys'

export function useTaskHistory(workspaceId: string, projectId: string, taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.history(workspaceId, projectId, taskId),
    queryFn: () => getTaskHistory(workspaceId, projectId, taskId),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(taskId),
  })
}
