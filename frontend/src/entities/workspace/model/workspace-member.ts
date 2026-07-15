export type WorkspaceRole = 'OWNER' | 'MEMBER'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  role: WorkspaceRole
  createdAt: string
  user: {
    id: string
    email: string
  }
}
