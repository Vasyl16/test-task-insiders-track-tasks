import { api } from '../axios/instance'
import type { Workspace } from '../../../entities/workspace/model/workspace'
import type { WorkspaceMember } from '../../../entities/workspace/model/workspace-member'

export interface WorkspacePayload {
  name: string
  description?: string
}

function toRequestBody(payload: Partial<WorkspacePayload>) {
  return {
    ...(payload.name !== undefined && { name: payload.name }),
    description: payload.description?.trim() ? payload.description.trim() : undefined,
  }
}

export interface WorkspacePage {
  items: Workspace[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type WorkspaceSortBy = 'name' | 'createdAt'
export type SortOrder = 'asc' | 'desc'
export type OwnershipFilter = 'all' | 'mine' | 'other'

export interface WorkspaceListParams {
  page: number
  limit: number
  search?: string
  sortBy?: WorkspaceSortBy
  sortOrder?: SortOrder
  ownership?: OwnershipFilter
}

export async function getWorkspacesPage(params: WorkspaceListParams): Promise<WorkspacePage> {
  const response = await api.get<WorkspacePage>('/workspaces', { params })
  return response.data
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const response = await api.get<Workspace>(`/workspaces/${id}`)
  return response.data
}

export async function createWorkspace(payload: WorkspacePayload): Promise<Workspace> {
  const response = await api.post<Workspace>('/workspaces', toRequestBody(payload))
  return response.data
}

export async function updateWorkspace(
  id: string,
  payload: Partial<WorkspacePayload>,
): Promise<Workspace> {
  const response = await api.patch<Workspace>(`/workspaces/${id}`, toRequestBody(payload))
  return response.data
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api.delete(`/workspaces/${id}`)
}

export async function getWorkspaceMembers(id: string): Promise<WorkspaceMember[]> {
  const response = await api.get<WorkspaceMember[]>(`/workspaces/${id}/members`)
  return response.data
}
