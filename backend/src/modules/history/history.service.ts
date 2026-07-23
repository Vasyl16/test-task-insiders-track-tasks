import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { decodeCursor, encodeCursor } from '@common/utils';
import { FindHistoryQueryDto } from './dto/find-history-query.dto';
import { TaskHistoryListResponseDto } from './dto/task-history-list-response.dto';
import { TaskHistoryResponseDto } from './dto/task-history-response.dto';
import { HistoryRepository } from './history.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
const TASK_NOT_FOUND_MESSAGE = 'Task not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const INVALID_CURSOR_MESSAGE = 'Invalid cursor';

interface HistoryCursor {
  changedAt: string;
  id: string;
}

@Injectable()
export class HistoryService {
  constructor(private readonly historyRepository: HistoryRepository) {}

  async findAllForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    query: FindHistoryQueryDto,
  ): Promise<TaskHistoryListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    await this.assertMember(workspaceId, userId);

    const before = query.cursor
      ? this.decodeHistoryCursor(query.cursor)
      : undefined;

    // Fetch one extra row as a peek: its presence is what tells us whether a
    // next page exists, with no separate count query.
    const rows = await this.historyRepository.findManyForTask(taskId, {
      take: query.limit + 1,
      before,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const lastRow = page[page.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            changedAt: lastRow.changedAt.toISOString(),
            id: lastRow.id,
          } satisfies HistoryCursor)
        : null;

    return new TaskHistoryListResponseDto(
      page.map((entry) => new TaskHistoryResponseDto(entry)),
      nextCursor,
    );
  }

  private decodeHistoryCursor(cursor: string): { changedAt: Date; id: string } {
    try {
      const parsed = decodeCursor<HistoryCursor>(cursor);
      if (
        typeof parsed.changedAt !== 'string' ||
        typeof parsed.id !== 'string'
      ) {
        throw new Error(INVALID_CURSOR_MESSAGE);
      }
      return { changedAt: new Date(parsed.changedAt), id: parsed.id };
    } catch {
      throw new BadRequestException(INVALID_CURSOR_MESSAGE);
    }
  }

  private async getWorkspaceOrThrow(workspaceId: string): Promise<void> {
    const workspace =
      await this.historyRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
  }

  private async getProjectOrThrow(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.historyRepository.findProjectById(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }
  }

  private async getTaskOrThrow(
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.historyRepository.findTaskById(taskId);
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(TASK_NOT_FOUND_MESSAGE);
    }
  }

  private async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.historyRepository.findWorkspaceMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
  }
}
