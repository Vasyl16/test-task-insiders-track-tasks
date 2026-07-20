import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { taskStatusValues, type Task, type TaskStatus } from "../../../entities/task/model/task";
import { createTask, deleteTask, getTask, getTasksPage, updateTask, type TaskPage, type TaskPayload } from "../queries/task";
import { queryKeys, type TaskListFilters } from "../queryKeys";

// Matches the backend's default page size (@Min(1) @Max(100), default 20) —
// each Kanban column lazy-loads its own status in pages of this size.
const TASKS_PAGE_SIZE = 10;

export function useTasksByStatus(
  workspaceId: string,
  projectId: string,
  status: TaskStatus,
  filters: TaskListFilters = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.list(workspaceId, projectId, status, filters),
    queryFn: ({ pageParam }) =>
      getTasksPage(workspaceId, projectId, {
        status,
        cursor: pageParam,
        limit: TASKS_PAGE_SIZE,
        ...filters,
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
// `filters` should be the board's *currently active* filters (search/priority/
// assignee), since that's what all three status columns are keyed on right
// now — passing the wrong ones just means the optimistic patch below finds no
// matching cache entry and silently no-ops; the reconciling invalidation in
// onSuccess still corrects the real state regardless.
export function useUpdateTask(workspaceId: string, projectId: string, filters: TaskListFilters = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string } & Partial<TaskPayload>) => {
      const { id, ...payload } = vars;
      return updateTask(workspaceId, projectId, id, payload);
    },
    // Only status changes move a task between Kanban columns, so that's the
    // only case worth an optimistic patch here — a title/priority/assignee-only
    // edit doesn't change which column list a task belongs to.
    onMutate: async (vars) => {
      if (vars.status === undefined) {
        return undefined;
      }

      const listKeys = taskStatusValues.map((status) => queryKeys.tasks.list(workspaceId, projectId, status, filters));
      await Promise.all(listKeys.map((key) => queryClient.cancelQueries({ queryKey: key })));

      const previousLists = listKeys.map((key) => [key, queryClient.getQueryData<InfiniteData<TaskPage>>(key)] as const);

      let movedTask: Task | undefined;
      for (const key of listKeys) {
        queryClient.setQueryData<InfiniteData<TaskPage>>(key, (old) => {
          if (!old) return old;
          let foundInThisList: Task | undefined;
          const pages = old.pages.map((page) => {
            const match = page.items.find((item) => item.id === vars.id);
            if (!match) return page;
            foundInThisList = match;
            return { ...page, items: page.items.filter((item) => item.id !== vars.id) };
          });
          if (foundInThisList) {
            movedTask = foundInThisList;
            return { ...old, pages };
          }
          return old;
        });
      }

      if (movedTask) {
        const destinationKey = queryKeys.tasks.list(workspaceId, projectId, vars.status, filters);
        const updatedTask = { ...movedTask, status: vars.status };
        queryClient.setQueryData<InfiniteData<TaskPage>>(destinationKey, (old) => {
          if (!old || old.pages.length === 0) return old;
          const [firstPage, ...rest] = old.pages;
          return { ...old, pages: [{ ...firstPage, items: [updatedTask, ...firstPage.items] }, ...rest] };
        });
      }

      return { previousLists };
    },
    onError: (_error, _vars, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
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
