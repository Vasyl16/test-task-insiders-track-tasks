import { Injectable } from '@nestjs/common';
import {
  InviteStatus,
  User,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

const INVITE_INCLUDE = {
  workspace: { select: { id: true, name: true } },
  invitedBy: { select: { id: true, name: true, email: true } },
} as const;

type InviteWithRelations = WorkspaceInvite & {
  workspace: Pick<Workspace, 'id' | 'name'>;
  invitedBy: Pick<User, 'id' | 'name' | 'email'>;
};

@Injectable()
export class InvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  findWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findPendingInvite(
    workspaceId: string,
    invitedUserId: string,
  ): Promise<WorkspaceInvite | null> {
    return this.prisma.workspaceInvite.findFirst({
      where: { workspaceId, invitedUserId, status: InviteStatus.PENDING },
    });
  }

  createInvite(data: {
    workspaceId: string;
    invitedUserId: string;
    invitedById: string;
  }): Promise<InviteWithRelations> {
    return this.prisma.workspaceInvite.create({
      data,
      include: INVITE_INCLUDE,
    });
  }

  findById(id: string): Promise<InviteWithRelations | null> {
    return this.prisma.workspaceInvite.findUnique({
      where: { id },
      include: INVITE_INCLUDE,
    });
  }

  findManyForUser(userId: string): Promise<InviteWithRelations[]> {
    return this.prisma.workspaceInvite.findMany({
      where: { invitedUserId: userId },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Marking the invite ACCEPTED and creating the resulting membership must
  // succeed or fail together — an invite silently left PENDING (or ACCEPTED
  // with no actual membership) would be worse than the request just failing.
  accept(
    id: string,
    workspaceId: string,
    userId: string,
  ): Promise<InviteWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: { workspaceId, userId, role: WorkspaceRole.MEMBER },
      });
      return tx.workspaceInvite.update({
        where: { id },
        data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() },
        include: INVITE_INCLUDE,
      });
    });
  }

  decline(id: string): Promise<InviteWithRelations> {
    return this.prisma.workspaceInvite.update({
      where: { id },
      data: { status: InviteStatus.DECLINED, respondedAt: new Date() },
      include: INVITE_INCLUDE,
    });
  }
}
