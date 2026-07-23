import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Comment, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { decodeCursor, encodeCursor } from '@common/utils';
import { CommentsRepository } from './comments.repository';
import { CommentListResponseDto } from './dto/comment-list-response.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
const TASK_NOT_FOUND_MESSAGE = 'Task not found';
const COMMENT_NOT_FOUND_MESSAGE = 'Comment not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const NOT_ALLOWED_MESSAGE =
  'Only the comment author or workspace owner can perform this action';
const INVALID_CURSOR_MESSAGE = 'Invalid cursor';

interface CommentCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class CommentsService {
  constructor(private readonly commentsRepository: CommentsRepository) {}

  async create(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    await this.assertMember(workspaceId, userId);

    const comment = await this.commentsRepository.create({
      taskId,
      authorId: userId,
      content: dto.content,
    });

    return new CommentResponseDto(comment);
  }

  async findAllForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    query: FindCommentsQueryDto,
  ): Promise<CommentListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    await this.assertMember(workspaceId, userId);

    const after = query.cursor
      ? this.decodeCommentCursor(query.cursor)
      : undefined;

    // Fetch one extra row as a peek: its presence is what tells us whether a
    // next page exists, with no separate count query.
    const rows = await this.commentsRepository.findManyForTask(taskId, {
      take: query.limit + 1,
      after,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const lastRow = page[page.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            createdAt: lastRow.createdAt.toISOString(),
            id: lastRow.id,
          } satisfies CommentCursor)
        : null;

    return new CommentListResponseDto(
      page.map((comment) => new CommentResponseDto(comment)),
      nextCursor,
    );
  }

  async update(
    workspaceId: string,
    projectId: string,
    taskId: string,
    id: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    const comment = await this.getCommentOrThrow(taskId, id);
    await this.assertAuthorOrOwner(workspaceId, userId, comment);

    const updated = await this.commentsRepository.update(id, {
      content: dto.content,
    });
    return new CommentResponseDto(updated);
  }

  async remove(
    workspaceId: string,
    projectId: string,
    taskId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    const comment = await this.getCommentOrThrow(taskId, id);
    await this.assertAuthorOrOwner(workspaceId, userId, comment);

    await this.commentsRepository.delete(id);
  }

  private async getWorkspaceOrThrow(workspaceId: string): Promise<void> {
    const workspace =
      await this.commentsRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
  }

  private async getProjectOrThrow(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.commentsRepository.findProjectById(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }
  }

  private async getTaskOrThrow(
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.commentsRepository.findTaskById(taskId);
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(TASK_NOT_FOUND_MESSAGE);
    }
  }

  private async getCommentOrThrow(
    taskId: string,
    id: string,
  ): Promise<Comment> {
    const comment = await this.commentsRepository.findById(id);
    if (!comment || comment.taskId !== taskId) {
      throw new NotFoundException(COMMENT_NOT_FOUND_MESSAGE);
    }
    return comment;
  }

  private async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.commentsRepository.findWorkspaceMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
    return membership;
  }

  private async assertAuthorOrOwner(
    workspaceId: string,
    userId: string,
    comment: Comment,
  ): Promise<void> {
    const membership = await this.assertMember(workspaceId, userId);
    const isAuthor = comment.authorId === userId;
    const isOwner = membership.role === WorkspaceRole.OWNER;

    if (!isAuthor && !isOwner) {
      throw new ForbiddenException(NOT_ALLOWED_MESSAGE);
    }
  }

  private decodeCommentCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const parsed = decodeCursor<CommentCursor>(cursor);
      if (
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.id !== 'string'
      ) {
        throw new Error(INVALID_CURSOR_MESSAGE);
      }
      return { createdAt: new Date(parsed.createdAt), id: parsed.id };
    } catch {
      throw new BadRequestException(INVALID_CURSOR_MESSAGE);
    }
  }
}
