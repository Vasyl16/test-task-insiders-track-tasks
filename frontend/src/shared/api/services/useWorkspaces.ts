import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceMembers,
  getWorkspacesPage,
  removeWorkspaceMember,
  updateWorkspace,
  type WorkspaceListParams,
  type WorkspaceMemberListParams,
  type WorkspacePayload,
} from '../queries/workspace'
import { queryKeys } from '../queryKeys'

export function useWorkspacesPage(params: WorkspaceListParams) {
  return useQuery({
    queryKey: queryKeys.workspaces.list(params),
    queryFn: () => getWorkspacesPage(params),
    placeholderData: keepPreviousData,
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => getWorkspace(id),
    enabled: Boolean(id),
  })
}

export function useWorkspaceMembers(id: string, params: WorkspaceMemberListParams) {
  return useQuery({
    queryKey: queryKeys.workspaces.members(id, params),
    queryFn: () => getWorkspaceMembers(id, params),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkspacePayload) => createWorkspace(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.lists })
    },
  })
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<WorkspacePayload>) => updateWorkspace(id, payload),
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspaces.detail(id), workspace)
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.lists })
    },
  })
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.membersLists(workspaceId) })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: (_data, id) => {
      // workspaces.lists is a prefix only the paged list keys share, so this
      // can't also match (and 404-refetch) this workspace's own detail query
      // the way invalidating workspaces.all would — no exact:true needed.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.lists,
      })
      queryClient.removeQueries({ queryKey: queryKeys.workspaces.detail(id) })
      queryClient.removeQueries({ queryKey: queryKeys.projects.all(id) })
    },
  })
}
