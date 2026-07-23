import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import {
  Project,
  Task,
  TaskHistory,
  User,
  Workspace,
  WorkspaceMember,
} from '@prisma/client';

type TaskHistoryWithChanger = TaskHistory & {
  changer: Pick<User, 'id' | 'email' | 'name'>;
};

@Injectable()
export class HistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  findProjectById(projectId: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id: projectId } });
  }

  findTaskById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  findWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  findManyForTask(
    taskId: string,
    params: { take: number; before?: { changedAt: Date; id: string } },
  ): Promise<TaskHistoryWithChanger[]> {
    return this.prisma.taskHistory.findMany({
      where: {
        taskId,
        // Keyset pagination: everything strictly "before" the cursor row in
        // (changedAt DESC, id DESC) order — same tie-break reasoning as
        // Tasks' own keyset pagination.
        ...(params.before && {
          OR: [
            { changedAt: { lt: params.before.changedAt } },
            {
              changedAt: params.before.changedAt,
              id: { lt: params.before.id },
            },
          ],
        }),
      },
      include: { changer: { select: { id: true, email: true, name: true } } },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
      take: params.take,
    });
  }
}
