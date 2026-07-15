export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  projects: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'projects'] as const,
    detail: (workspaceId: string, id: string) =>
      ['workspaces', workspaceId, 'projects', id] as const,
  },
  tasks: {
    all: (workspaceId: string, projectId: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks'] as const,
    detail: (workspaceId: string, projectId: string, id: string) =>
      ['workspaces', workspaceId, 'projects', projectId, 'tasks', id] as const,
  },
}
