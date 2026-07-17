import { api } from '../axios/instance'
import type { Project } from '../../../entities/project/model/project'

export interface ProjectPayload {
  name: string
  description?: string
}

function toRequestBody(payload: Partial<ProjectPayload>) {
  return {
    ...(payload.name !== undefined && { name: payload.name }),
    description: payload.description?.trim() ? payload.description.trim() : undefined,
  }
}

export interface ProjectPage {
  items: Project[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getProjectsPage(
  workspaceId: string,
  params: { page: number; limit: number },
): Promise<ProjectPage> {
  const response = await api.get<ProjectPage>(`/workspaces/${workspaceId}/projects`, { params })
  return response.data
}

export async function getProject(workspaceId: string, id: string): Promise<Project> {
  const response = await api.get<Project>(`/workspaces/${workspaceId}/projects/${id}`)
  return response.data
}

export async function createProject(
  workspaceId: string,
  payload: ProjectPayload,
): Promise<Project> {
  const response = await api.post<Project>(
    `/workspaces/${workspaceId}/projects`,
    toRequestBody(payload),
  )
  return response.data
}

export async function updateProject(
  workspaceId: string,
  id: string,
  payload: Partial<ProjectPayload>,
): Promise<Project> {
  const response = await api.patch<Project>(
    `/workspaces/${workspaceId}/projects/${id}`,
    toRequestBody(payload),
  )
  return response.data
}

export async function deleteProject(workspaceId: string, id: string): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/projects/${id}`)
}
