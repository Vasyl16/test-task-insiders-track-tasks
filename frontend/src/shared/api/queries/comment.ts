import { api } from '../axios/instance'
import type { Comment } from '../../../entities/comment/model/comment'

export interface CommentPayload {
  content: string
}

export interface CommentPage {
  items: Comment[]
  nextCursor: string | null
}

export interface CommentsPageParams {
  cursor?: string
  limit?: number
}

function commentsUrl(workspaceId: string, projectId: string, taskId: string) {
  return `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`
}

export async function getCommentsPage(
  workspaceId: string,
  projectId: string,
  taskId: string,
  params: CommentsPageParams,
): Promise<CommentPage> {
  const response = await api.get<CommentPage>(commentsUrl(workspaceId, projectId, taskId), {
    params,
  })
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
