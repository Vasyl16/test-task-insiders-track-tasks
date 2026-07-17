import { WorkspaceRole } from '@prisma/client';

export class WorkspaceMemberResponseDto {
  id: string;
  workspaceId: string;
  role: WorkspaceRole;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };

  constructor(member: {
    id: string;
    workspaceId: string;
    role: WorkspaceRole;
    createdAt: Date;
    user: { id: string; email: string; name: string };
  }) {
    this.id = member.id;
    this.workspaceId = member.workspaceId;
    this.role = member.role;
    this.createdAt = member.createdAt;
    this.user = {
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
    };
  }
}
