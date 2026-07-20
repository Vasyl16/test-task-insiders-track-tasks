import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';
import {
  OwnershipFilter,
  SortOrder,
  WorkspaceSortBy,
} from './dto/find-workspaces-query.dto';

type WorkspaceMemberWithUser = WorkspaceMember & {
  user: Pick<User, 'id' | 'email' | 'name'>;
};

export interface WorkspaceListFilters {
  search?: string;
  ownership: OwnershipFilter;
}

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
    params: {
      skip: number;
      take: number;
      sortBy: WorkspaceSortBy;
      sortOrder: SortOrder;
    } & WorkspaceListFilters,
  ): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: this.buildWhereForUser(userId, params),
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
    });
  }

  countForUser(userId: string, filters: WorkspaceListFilters): Promise<number> {
    return this.prisma.workspace.count({
      where: this.buildWhereForUser(userId, filters),
    });
  }

  private buildWhereForUser(
    userId: string,
    filters: WorkspaceListFilters,
  ): Prisma.WorkspaceWhereInput {
    return {
      members: { some: { userId } },
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
      ...(filters.ownership === 'mine' && { ownerId: userId }),
      ...(filters.ownership === 'other' && { ownerId: { not: userId } }),
    };
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
