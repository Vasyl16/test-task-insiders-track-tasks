import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskStatus } from "../../../entities/task/model/task";
import { createTask, deleteTask, getTask, getTasksPage, updateTask, type TaskPayload } from "../queries/task";
import { queryKeys } from "../queryKeys";

// Matches the backend's default page size (@Min(1) @Max(100), default 20) —
// each Kanban column lazy-loads its own status in pages of this size.
const TASKS_PAGE_SIZE = 10;

export function useTasksByStatus(workspaceId: string, projectId: string, status: TaskStatus) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.list(workspaceId, projectId, status),
    queryFn: ({ pageParam }) =>
      getTasksPage(workspaceId, projectId, {
        status,
        cursor: pageParam,
        limit: TASKS_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(workspaceId) && Boolean(projectId),
  });
}

export function useTask(workspaceId: string, projectId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(workspaceId, projectId, id),
    queryFn: () => getTask(workspaceId, projectId, id),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(id),
  });
}

export function useCreateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskPayload) => createTask(workspaceId, projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(workspaceId, projectId),
      });
    },
  });
}

// Takes `id` per-call (like useDeleteTask) rather than at hook-creation time,
// so one hook instance can update any row in a list without a hook-per-row.
export function useUpdateTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string } & Partial<TaskPayload>) => {
      const { id, ...payload } = vars;
      return updateTask(workspaceId, projectId, id, payload);
    },
    onSuccess: (task, vars) => {
      queryClient.setQueryData(queryKeys.tasks.detail(workspaceId, projectId, vars.id), task);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(workspaceId, projectId),
      });
      // Harmless no-op if status didn't change or the history section isn't
      // mounted — but if it is (TaskDetailModal open), the new entry the
      // backend just wrote needs to actually show up without a manual reload.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.history(workspaceId, projectId, vars.id),
      });
    },
  });
}

export function useDeleteTask(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(workspaceId, projectId, id),
    onSuccess: (_data, id) => {
      // tasks.lists() is a prefix only the per-status list keys share, so
      // this can't also match (and 404-refetch) this task's own detail
      // query the way invalidating tasks.all() would — no exact:true needed.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(workspaceId, projectId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.tasks.detail(workspaceId, projectId, id),
      });
    },
  });
}
