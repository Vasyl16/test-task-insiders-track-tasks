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

  findManyForTask(taskId: string): Promise<TaskHistoryWithChanger[]> {
    return this.prisma.taskHistory.findMany({
      where: { taskId },
      include: { changer: { select: { id: true, email: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
  }
}
