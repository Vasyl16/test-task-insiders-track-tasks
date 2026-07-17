import type { TaskStatus } from '../../entities/task/model/task'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    // Prefix shared by every paged list key below — see projects.lists for
    // why this needs to be its own key rather than reusing `all`.
    lists: ['workspaces', 'list'] as const,
    list: (page: number, limit: number) => ['workspaces', 'list', page, limit] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  projects: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'projects'] as const,
    // Prefix shared by every paged list key below — invalidate this to
    // refetch the workspace's project pages without also matching (and
    // 404-ing) any single project's own detail query.
    lists: (workspaceId: string) => ['workspaces', workspaceId, 'projects', 'list'] as const,
    list: (workspaceId: string, page: number, limit: number) =>
      ['workspaces', workspaceId, 'projects', 'list', page, limit] as const,
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
    list: (workspaceId: string, projectId: string, status: TaskStatus) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', 'list', status] as const,
    detail: (workspaceId: string, projectId: string, id: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', id] as const,
    comments: (workspaceId: string, projectId: string, taskId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'comments'] as const,
    history: (workspaceId: string, projectId: string, taskId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'history'] as const,
  },
}
