import { hashParams } from '@common/utils';

// Centralizes every cache key this app writes, so the modules that
// invalidate a key (often a different module than the one that cached it —
// e.g. accepting an invite touches the workspace's own caches) always agree
// on its exact shape, instead of each duplicating template strings that can
// silently drift apart.
export const cacheKeys = {
  authUser: (id: string): string => `auth:user:${id}`,

  workspaceDetail: (id: string): string => `workspaces:${id}`,
  workspaceListPrefix: (userId: string): string => `workspaces:list:${userId}:`,
  workspaceList: (userId: string, params: Record<string, unknown>): string =>
    `${cacheKeys.workspaceListPrefix(userId)}${hashParams(params)}`,
  workspaceMembersPrefix: (workspaceId: string): string =>
    `workspaces:${workspaceId}:members:`,
  workspaceMembers: (
    workspaceId: string,
    params: Record<string, unknown>,
  ): string =>
    `${cacheKeys.workspaceMembersPrefix(workspaceId)}${hashParams(params)}`,

  projectDetail: (workspaceId: string, id: string): string =>
    `projects:${workspaceId}:${id}`,
  // Keyed by (workspaceId, userId), not just workspaceId - the `ownership`
  // filter ('mine'/'other') makes a project list's contents depend on who's
  // asking, not only which workspace/page/sort/search was requested.
  projectListPrefix: (workspaceId: string, userId: string): string =>
    `projects:list:${workspaceId}:${userId}:`,
  projectList: (
    workspaceId: string,
    userId: string,
    params: Record<string, unknown>,
  ): string =>
    `${cacheKeys.projectListPrefix(workspaceId, userId)}${hashParams(params)}`,

  invitesMe: (userId: string): string => `invites:me:${userId}`,
};
