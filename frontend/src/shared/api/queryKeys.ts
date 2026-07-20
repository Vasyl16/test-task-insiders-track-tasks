import type { TaskStatus } from '../../entities/task/model/task'
import type { WorkspaceListParams } from './queries/workspace'
import type { ProjectListParams } from './queries/project'
import type { TasksPageParams } from './queries/task'

// The per-status list query additionally keys on these filters (everything
// TasksPageParams carries except status/cursor/limit, which the query itself
// already varies by way of the hook's own args/pagination).
export type TaskListFilters = Pick<TasksPageParams, 'search' | 'priority' | 'assigneeId'>

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  invites: {
    mine: ['invites', 'me'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    // Prefix shared by every paged list key below — see projects.lists for
    // why this needs to be its own key rather than reusing `all`.
    lists: ['workspaces', 'list'] as const,
    // The whole params object (page/limit/search/sort/ownership) becomes one
    // key segment — React Query hashes it structurally, so different filter
    // combinations naturally get their own cache entry without listing each
    // field out here individually.
    list: (params: WorkspaceListParams) => ['workspaces', 'list', params] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  projects: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'projects'] as const,
    // Prefix shared by every paged list key below — invalidate this to
    // refetch the workspace's project pages without also matching (and
    // 404-ing) any single project's own detail query.
    lists: (workspaceId: string) => ['workspaces', workspaceId, 'projects', 'list'] as const,
    list: (workspaceId: string, params: ProjectListParams) =>
      ['workspaces', workspaceId, 'projects', 'list', params] as const,
    detail: (workspaceId: string, id: string) =>
      ['workspaces', workspaceId, 'projects', id] as const,
  },
  tasks: {
    all: (workspaceId: string, projectId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks'] as const,
    // Prefix shared by every per-status list key below — invalidate this to
    // refetch all Kanban columns without also matching (and 404-ing) any
    // single task's own detail query.
    lists: (workspaceId: string, projectId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', 'list'] as const,
    list: (
      workspaceId: string,
      projectId: string,
      status: TaskStatus,
      filters: TaskListFilters,
    ) => ['workspaces', workspaceId, 'projects', projectId, 'tasks', 'list', status, filters] as const,
    detail: (workspaceId: string, projectId: string, id: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', id] as const,
    comments: (workspaceId: string, projectId: string, taskId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'comments'] as const,
    history: (workspaceId: string, projectId: string, taskId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'history'] as const,
  },
}
