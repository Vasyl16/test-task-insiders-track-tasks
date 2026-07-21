import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskHistoryResponseDto } from './dto/task-history-response.dto';
import { HistoryRepository } from './history.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
const TASK_NOT_FOUND_MESSAGE = 'Task not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';

@Injectable()
export class HistoryService {
  constructor(private readonly historyRepository: HistoryRepository) {}

  async findAllForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskHistoryResponseDto[]> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.getProjectOrThrow(workspaceId, projectId);
    await this.getTaskOrThrow(projectId, taskId);
    await this.assertMember(workspaceId, userId);

    const entries = await this.historyRepository.findManyForTask(taskId);
    return entries.map((entry) => new TaskHistoryResponseDto(entry));
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
