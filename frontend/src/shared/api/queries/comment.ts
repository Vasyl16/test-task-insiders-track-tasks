import { api } from '../axios/instance'
import type { Comment } from '../../../entities/comment/model/comment'

export interface CommentPayload {
  content: string
}

function commentsUrl(workspaceId: string, projectId: string, taskId: string) {
  return `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`
}

export async function getComments(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<Comment[]> {
  const response = await api.get<Comment[]>(commentsUrl(workspaceId, projectId, taskId))
  return response.data
}

export async function createComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  payload: CommentPayload,
): Promise<Comment> {
  const response = await api.post<Comment>(
    commentsUrl(workspaceId, projectId, taskId),
    payload,
  )
  return response.data
}

export async function updateComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  id: string,
  payload: CommentPayload,
): Promise<Comment> {
  const response = await api.patch<Comment>(
    `${commentsUrl(workspaceId, projectId, taskId)}/${id}`,
    payload,
  )
  return response.data
}

export async function deleteComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  id: string,
): Promise<void> {
  await api.delete(`${commentsUrl(workspaceId, projectId, taskId)}/${id}`)
}
