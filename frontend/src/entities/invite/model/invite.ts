export const inviteStatusValues = ['PENDING', 'ACCEPTED', 'DECLINED'] as const
export type InviteStatus = (typeof inviteStatusValues)[number]

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  PENDING: 'Active',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
}

export interface Invite {
  id: string
  status: InviteStatus
  createdAt: string
  respondedAt: string | null
  workspace: {
    id: string
    name: string
  }
  invitedBy: {
    id: string
    name: string
    email: string
  }
}
