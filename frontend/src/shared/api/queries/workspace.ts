import { api } from '../axios/instance'
import type { Workspace } from '../../../entities/workspace/model/workspace'

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

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await api.get<Workspace[]>('/workspaces')
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
