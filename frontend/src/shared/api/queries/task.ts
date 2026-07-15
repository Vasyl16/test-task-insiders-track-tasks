import { api } from '../axios/instance'
import type { Task, TaskStatus } from '../../../entities/task/model/task'

export interface TaskPayload {
  title: string
  description?: string
  status?: TaskStatus
  assigneeId?: string | null
}

function toRequestBody(payload: Partial<TaskPayload>) {
  return {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.status !== undefined && { status: payload.status }),
    ...('assigneeId' in payload && { assigneeId: payload.assigneeId || null }),
    description: payload.description?.trim() ? payload.description.trim() : undefined,
  }
}

export async function getTasks(workspaceId: string, projectId: string): Promise<Task[]> {
  const response = await api.get<Task[]>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
  )
  return response.data
}

export async function getTask(
  workspaceId: string,
  projectId: string,
  id: string,
): Promise<Task> {
  const response = await api.get<Task>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${id}`,
  )
  return response.data
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  payload: TaskPayload,
): Promise<Task> {
  const response = await api.post<Task>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    toRequestBody(payload),
  )
  return response.data
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  id: string,
  payload: Partial<TaskPayload>,
): Promise<Task> {
  const response = await api.patch<Task>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${id}`,
    toRequestBody(payload),
  )
  return response.data
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  id: string,
): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${id}`)
}
