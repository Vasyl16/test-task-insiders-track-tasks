import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
  type ProjectPayload,
} from '../queries/project'
import { queryKeys } from '../queryKeys'

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.projects.all(workspaceId),
    queryFn: () => getProjects(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useProject(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(workspaceId, id),
    queryFn: () => getProject(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
  })
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProjectPayload) => createProject(workspaceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceId),
      })
    },
  })
}

export function useUpdateProject(workspaceId: string, id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) => updateProject(workspaceId, id, payload),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(workspaceId, id), project)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceId),
      })
    },
  })
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteProject(workspaceId, id),
    onSuccess: (_data, id) => {
      // exact: true — see useDeleteWorkspace for why a fuzzy match here would
      // needlessly refetch (and 404) this project's own now-gone detail query.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceId),
        exact: true,
      })
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(workspaceId, id),
      })
    },
  })
}
