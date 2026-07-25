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

  // Looks up an existing account only — there's no separate "invited email"
  // record to fall back to. An email with no matching User returns null,
  // and the service turns that into a 404 rather than inviting the email
  // address itself. See the comment in InvitesService.create for why
  // invite-by-email-only isn't supported yet.
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
  //
  // The status transition itself is an atomic, conditional updateMany
  // (WHERE id AND status = PENDING), not a plain update — a plain update
  // would blindly overwrite the status regardless of what it currently is,
  // which is exactly how a concurrent accept/decline (or a retried accept)
  // could silently clobber whichever one lost the race. `count === 0` means
  // someone else already actioned this invite in between the service's own
  // pending-check and this call — the service maps that to a 409, same as
  // the ordinary sequential case.
  //
  // A second, independent race remains even with that guard: two *separate*
  // pending invites for the same (workspaceId, userId) — only possible
  // before the partial unique index existed, or from data older than it —
  // being accepted concurrently. Each accept's own updateMany succeeds (they
  // touch different invite rows), but the second workspaceMember.create
  // hits WorkspaceMember's existing @@unique([workspaceId, userId]) and
  // throws a Prisma P2002, rolling back this whole transaction (including
  // its own status update) — the service catches that and maps it to the
  // same "already a member" 409.
  accept(
    id: string,
    workspaceId: string,
    userId: string,
  ): Promise<InviteWithRelations | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.workspaceInvite.updateMany({
        where: { id, status: InviteStatus.PENDING },
        data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() },
      });
      if (count === 0) {
        return null;
      }

      await tx.workspaceMember.create({
        data: { workspaceId, userId, role: WorkspaceRole.MEMBER },
      });
      return tx.workspaceInvite.findUniqueOrThrow({
        where: { id },
        include: INVITE_INCLUDE,
      });
    });
  }

  // Same atomic-conditional-update reasoning as accept() above, guarding
  // against a concurrent accept/decline/decline on the same invite. A
  // single updateMany is already atomic on its own — no transaction needed
  // since decline (unlike accept) never touches a second table.
  async decline(id: string): Promise<InviteWithRelations | null> {
    const { count } = await this.prisma.workspaceInvite.updateMany({
      where: { id, status: InviteStatus.PENDING },
      data: { status: InviteStatus.DECLINED, respondedAt: new Date() },
    });
    if (count === 0) {
      return null;
    }

    return this.prisma.workspaceInvite.findUniqueOrThrow({
      where: { id },
      include: INVITE_INCLUDE,
    });
  }
}
