import { api } from '../axios/instance'
import type { TaskHistoryEntry } from '../../../entities/task/model/task'

export async function getTaskHistory(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskHistoryEntry[]> {
  const response = await api.get<TaskHistoryEntry[]>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/history`,
  )
  return response.data
}
