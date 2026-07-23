import { api } from '../axios/instance'
import type { TaskHistoryEntry } from '../../../entities/task/model/task'

export interface TaskHistoryPage {
  items: TaskHistoryEntry[]
  nextCursor: string | null
}

export interface TaskHistoryPageParams {
  cursor?: string
  limit?: number
}

export async function getTaskHistoryPage(
  workspaceId: string,
  projectId: string,
  taskId: string,
  params: TaskHistoryPageParams,
): Promise<TaskHistoryPage> {
  const response = await api.get<TaskHistoryPage>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/history`,
    { params },
  )
  return response.data
}
