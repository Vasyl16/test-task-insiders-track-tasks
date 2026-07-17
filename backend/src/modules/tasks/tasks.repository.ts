import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceMember,
} from '@prisma/client';

@Injectable()
export class TasksRepository {
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

  create(data: {
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    createdBy: string;
  }): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  findManyForProject(
    projectId: string,
    params: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      take: number;
      before?: { createdAt: Date; id: string };
    },
  ): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        projectId,
        status: params.status,
        priority: params.priority,
        assigneeId: params.assigneeId,
        // Keyset pagination: everything strictly "before" the cursor row in
        // (createdAt DESC, id DESC) order. The id tiebreak is what makes the
        // sort — and therefore the cursor — deterministic when two tasks
        // share a createdAt timestamp.
        ...(params.before && {
          OR: [
            { createdAt: { lt: params.before.createdAt } },
            {
              createdAt: params.before.createdAt,
              id: { lt: params.before.id },
            },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.take,
    });
  }

  // When the update includes a genuine status change, the task row and its
  // TaskHistory entry are written in one transaction — an audit trail that
  // silently missed a status change would be worse than not having one.
  // Duplicates a small Prisma call rather than depending on the History
  // module's own repository, same "each module's repository only talks to
  // Prisma, never another module's repository" precedent as Projects/Tasks
  // duplicating Workspace lookups.
  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
    },
    statusChange?: {
      userId: string;
      oldStatus: TaskStatus;
      newStatus: TaskStatus;
    },
  ): Promise<Task> {
    if (!statusChange) {
      return this.prisma.task.update({ where: { id }, data });
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({ where: { id }, data });
      await tx.taskHistory.create({
        data: {
          taskId: id,
          changedBy: statusChange.userId,
          oldStatus: statusChange.oldStatus,
          newStatus: statusChange.newStatus,
        },
      });
      return task;
    });
  }

  delete(id: string): Promise<Task> {
    return this.prisma.task.delete({ where: { id } });
  }
}
