import { api } from '../axios/instance'
import type { Invite } from '../../../entities/invite/model/invite'

export async function createInvite(workspaceId: string, email: string): Promise<Invite> {
  const response = await api.post<Invite>(`/workspaces/${workspaceId}/invites`, { email })
  return response.data
}

export async function getMyInvites(): Promise<Invite[]> {
  const response = await api.get<Invite[]>('/invites/me')
  return response.data
}

export async function acceptInvite(id: string): Promise<Invite> {
  const response = await api.post<Invite>(`/invites/${id}/accept`)
  return response.data
}

export async function declineInvite(id: string): Promise<Invite> {
  const response = await api.post<Invite>(`/invites/${id}/decline`)
  return response.data
}
