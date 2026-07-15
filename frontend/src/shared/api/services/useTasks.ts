import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask,
  type TaskPayload,
} from '../queries/task'
import { queryKeys } from '../queryKeys'

export function useTasks(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.all(workspaceId, projectId),
    queryFn: () => getTasks(workspaceId, projectId),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  })
}

export function useTask(workspaceId: string, projectId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(workspaceId, projectId, id),
    queryFn: () => getTask(workspaceId, projectId, id),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(id),
  })
}

export function useCreateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TaskPayload) => createTask(workspaceId, projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all(workspaceId, projectId),
      })
    },
  })
}

// Takes `id` per-call (like useDeleteTask) rather than at hook-creation time,
// so one hook instance can update any row in a list without a hook-per-row.
export function useUpdateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { id: string } & Partial<TaskPayload>) => {
      const { id, ...payload } = vars
      return updateTask(workspaceId, projectId, id, payload)
    },
    onSuccess: (task, vars) => {
      queryClient.setQueryData(
        queryKeys.tasks.detail(workspaceId, projectId, vars.id),
        task,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all(workspaceId, projectId),
      })
    },
  })
}

export function useDeleteTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTask(workspaceId, projectId, id),
    onSuccess: (_data, id) => {
      // exact: true + removeQueries — see useDeleteWorkspace for why a fuzzy
      // list invalidation would needlessly refetch (and 404) this task's own
      // now-gone detail query.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all(workspaceId, projectId),
        exact: true,
      })
      queryClient.removeQueries({
        queryKey: queryKeys.tasks.detail(workspaceId, projectId, id),
      })
    },
  })
}
