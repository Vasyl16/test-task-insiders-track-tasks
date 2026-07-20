import { InviteStatus, User, Workspace, WorkspaceInvite } from '@prisma/client';

type InviteWithRelations = WorkspaceInvite & {
  workspace: Pick<Workspace, 'id' | 'name'>;
  invitedBy: Pick<User, 'id' | 'name' | 'email'>;
};

export class InviteResponseDto {
  id: string;
  status: InviteStatus;
  createdAt: Date;
  respondedAt: Date | null;
  workspace: { id: string; name: string };
  invitedBy: { id: string; name: string; email: string };

  constructor(invite: InviteWithRelations) {
    this.id = invite.id;
    this.status = invite.status;
    this.createdAt = invite.createdAt;
    this.respondedAt = invite.respondedAt;
    this.workspace = { id: invite.workspace.id, name: invite.workspace.name };
    this.invitedBy = {
      id: invite.invitedBy.id,
      name: invite.invitedBy.name,
      email: invite.invitedBy.email,
    };
  }
}
