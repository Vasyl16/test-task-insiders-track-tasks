import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
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

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

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
      assigneeId: dto.assigneeId,
      createdBy: userId,
    });

    return new TaskResponseDto(task);
  }

  async findAllForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskResponseDto[]> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.assertMember(workspaceId, userId);

    const tasks = await this.tasksRepository.findManyForProject(projectId);
    return tasks.map((task) => new TaskResponseDto(task));
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
    await this.getTaskOrThrow(projectId, id);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(workspaceId, dto.assigneeId);
    }

    const task = await this.tasksRepository.update(id, dto);
    return new TaskResponseDto(task);
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
}
