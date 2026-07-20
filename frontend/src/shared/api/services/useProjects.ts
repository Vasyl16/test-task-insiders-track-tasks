import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, deleteProject, getProject, getProjectsPage, updateProject, type ProjectListParams, type ProjectPayload } from "../queries/project";
import { queryKeys } from "../queryKeys";

export function useProjectsPage(workspaceId: string, params: ProjectListParams) {
  return useQuery({
    queryKey: queryKeys.projects.list(workspaceId, params),
    queryFn: () => getProjectsPage(workspaceId, params),
    enabled: Boolean(workspaceId),
    // Keep the previous page's rows on screen while the next page loads,
    // instead of flashing a loading state on every Next/Previous click.
    placeholderData: keepPreviousData,
  });
}

export function useProject(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(workspaceId, id),
    queryFn: () => getProject(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
  });
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectPayload) => createProject(workspaceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(workspaceId),
      });
    },
  });
}

export function useUpdateProject(workspaceId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) => updateProject(workspaceId, id, payload),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(workspaceId, id), project);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(workspaceId),
      });
    },
  });
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(workspaceId, id),
    onSuccess: (_data, id) => {
      // projects.lists() is a prefix only the paged list keys share, so this
      // can't also match (and 404-refetch) this project's own detail query
      // the way invalidating projects.all() would — no exact:true needed.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(workspaceId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(workspaceId, id),
      });
    },
  });
}
