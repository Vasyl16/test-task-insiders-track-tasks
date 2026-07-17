import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';

type WorkspaceMemberWithUser = WorkspaceMember & {
  user: Pick<User, 'id' | 'email' | 'name'>;
};

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwner(data: {
    name: string;
    description?: string;
    ownerId: string;
  }): Promise<Workspace> {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: data.ownerId,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });
  }

  findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  findManyForUser(
    userId: string,
    params: { skip: number; take: number },
  ): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  countForUser(userId: string): Promise<number> {
    return this.prisma.workspace.count({
      where: { members: { some: { userId } } },
    });
  }

  findMembership(
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

  addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberWithUser> {
    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  findMembersForWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  update(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Workspace> {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  delete(id: string): Promise<Workspace> {
    return this.prisma.workspace.delete({ where: { id } });
  }
}
