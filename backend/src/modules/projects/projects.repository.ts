import { Injectable } from '@nestjs/common';
import { Prisma, Project, Workspace, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import {
  OwnershipFilter,
  ProjectSortBy,
  SortOrder,
} from './dto/find-projects-query.dto';

export interface ProjectListFilters {
  search?: string;
  ownership: OwnershipFilter;
}

@Injectable()
export class ProjectsRepository {
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

  create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    createdBy: string;
  }): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  findManyForWorkspace(
    workspaceId: string,
    userId: string,
    params: {
      skip: number;
      take: number;
      sortBy: ProjectSortBy;
      sortOrder: SortOrder;
    } & ProjectListFilters,
  ): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: this.buildWhereForWorkspace(workspaceId, userId, params),
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.skip,
      take: params.take,
    });
  }

  countForWorkspace(
    workspaceId: string,
    userId: string,
    filters: ProjectListFilters,
  ): Promise<number> {
    return this.prisma.project.count({
      where: this.buildWhereForWorkspace(workspaceId, userId, filters),
    });
  }

  private buildWhereForWorkspace(
    workspaceId: string,
    userId: string,
    filters: ProjectListFilters,
  ): Prisma.ProjectWhereInput {
    return {
      workspaceId,
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
      ...(filters.ownership === 'mine' && { createdBy: userId }),
      ...(filters.ownership === 'other' && { createdBy: { not: userId } }),
    };
  }

  update(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  delete(id: string): Promise<Project> {
    return this.prisma.project.delete({ where: { id } });
  }
}
