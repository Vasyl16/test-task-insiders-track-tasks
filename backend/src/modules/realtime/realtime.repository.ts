import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Project, Workspace, WorkspaceMember } from '@prisma/client';

// Small duplicated lookups, same "each module's repository only talks to
// Prisma, never another module's repository" convention already used by
// TasksRepository/CommentsRepository/etc.
@Injectable()
export class RealtimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  findProjectById(projectId: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id: projectId } });
  }

  findWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }
}
