import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { TaskListResponseDto } from './dto/task-list-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
const TASK_NOT_FOUND_MESSAGE = 'Task not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const NOT_ALLOWED_MESSAGE =
  'Only the task creator or workspace owner can perform this action';
const ASSIGNEE_NOT_A_MEMBER_MESSAGE =
  'The assignee must be a member of this workspace';
const INVALID_CURSOR_MESSAGE = 'Invalid cursor';

interface TaskCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(
    workspaceId: string,
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.assertMember(workspaceId, userId);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(workspaceId, dto.assigneeId);
    }

    const task = await this.tasksRepository.create({
      projectId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate,
      createdBy: userId,
    });

    const responseDto = new TaskResponseDto(task);
    this.realtimeService.emitTaskCreated(projectId, responseDto, userId);
    return responseDto;
  }

  async findAllForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    query: FindTasksQueryDto,
  ): Promise<TaskListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.assertMember(workspaceId, userId);

    const before = query.cursor ? this.decodeCursor(query.cursor) : undefined;

    // Fetch one extra row as a peek: its presence is what tells us whether a
    // next page exists, with no separate count query.
    const rows = await this.tasksRepository.findManyForProject(projectId, {
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      search: query.search,
      take: query.limit + 1,
      before,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const lastRow = page[page.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? this.encodeCursor({
            createdAt: lastRow.createdAt.toISOString(),
            id: lastRow.id,
          })
        : null;

    return new TaskListResponseDto(
      page.map((task) => new TaskResponseDto(task)),
      nextCursor,
    );
  }

  async findOne(
    workspaceId: string,
    projectId: string,
    id: string,
    userId: string,
  ): Promise<TaskResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.assertMember(workspaceId, userId);
    const task = await this.getTaskOrThrow(projectId, id);

    return new TaskResponseDto(task);
  }

  async update(
    workspaceId: string,
    projectId: string,
    id: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.assertMember(workspaceId, userId);
    const existingTask = await this.getTaskOrThrow(projectId, id);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(workspaceId, dto.assigneeId);
    }

    const statusChange =
      dto.status && dto.status !== existingTask.status
        ? { userId, oldStatus: existingTask.status, newStatus: dto.status }
        : undefined;

    const task = await this.tasksRepository.update(id, dto, statusChange);
    const responseDto = new TaskResponseDto(task);
    this.realtimeService.emitTaskUpdated(projectId, responseDto, userId);
    return responseDto;
  }

  async remove(
    workspaceId: string,
    projectId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    const task = await this.getTaskOrThrow(projectId, id);
    await this.assertCreatorOrOwner(workspaceId, userId, task);

    await this.tasksRepository.delete(id);
    this.realtimeService.emitTaskDeleted(projectId, id, userId);
  }

  private async getWorkspaceOrThrow(workspaceId: string): Promise<void> {
    const workspace = await this.tasksRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
  }

  private async getProjectOrThrow(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.tasksRepository.findProjectById(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }
  }

  private async getTaskOrThrow(projectId: string, id: string): Promise<Task> {
    const task = await this.tasksRepository.findById(id);
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(TASK_NOT_FOUND_MESSAGE);
    }
    return task;
  }

  private async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.tasksRepository.findWorkspaceMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
    return membership;
  }

  private async assertAssigneeIsMember(
    workspaceId: string,
    assigneeId: string,
  ): Promise<void> {
    const membership = await this.tasksRepository.findWorkspaceMembership(
      workspaceId,
      assigneeId,
    );
    if (!membership) {
      throw new BadRequestException(ASSIGNEE_NOT_A_MEMBER_MESSAGE);
    }
  }

  private async assertCreatorOrOwner(
    workspaceId: string,
    userId: string,
    task: Task,
  ): Promise<void> {
    const membership = await this.assertMember(workspaceId, userId);
    const isCreator = task.createdBy === userId;
    const isOwner = membership.role === WorkspaceRole.OWNER;

    if (!isCreator && !isOwner) {
      throw new ForbiddenException(NOT_ALLOWED_MESSAGE);
    }
  }

  private encodeCursor(cursor: TaskCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as TaskCursor;
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
