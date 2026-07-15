import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
  type WorkspacePayload,
} from '../queries/workspace'
import { queryKeys } from '../queryKeys'

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: getWorkspaces,
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => getWorkspace(id),
    enabled: Boolean(id),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkspacePayload) => createWorkspace(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<WorkspacePayload>) => updateWorkspace(id, payload),
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspaces.detail(id), workspace)
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: (_data, id) => {
      // exact: true — a fuzzy match would also refetch this workspace's now-gone
      // detail/projects queries if they're still mounted (e.g. its own page,
      // mid-navigation-away), which would 404 for no reason.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.all,
        exact: true,
      })
      queryClient.removeQueries({ queryKey: queryKeys.workspaces.detail(id) })
      queryClient.removeQueries({ queryKey: queryKeys.projects.all(id) })
    },
  })
}
