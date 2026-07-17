import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import {
  Comment,
  Project,
  Task,
  User,
  Workspace,
  WorkspaceMember,
} from '@prisma/client';

type CommentWithAuthor = Comment & {
  author: Pick<User, 'id' | 'email' | 'name'>;
};

@Injectable()
export class CommentsRepository {
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

  create(data: {
    taskId: string;
    authorId: string;
    content: string;
  }): Promise<CommentWithAuthor> {
    return this.prisma.comment.create({
      data,
      include: { author: { select: { id: true, email: true, name: true } } },
    });
  }

  findById(id: string): Promise<Comment | null> {
    return this.prisma.comment.findUnique({ where: { id } });
  }

  findManyForTask(taskId: string): Promise<CommentWithAuthor[]> {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  update(id: string, data: { content: string }): Promise<CommentWithAuthor> {
    return this.prisma.comment.update({
      where: { id },
      data,
      include: { author: { select: { id: true, email: true, name: true } } },
    });
  }

  delete(id: string): Promise<Comment> {
    return this.prisma.comment.delete({ where: { id } });
  }
}
