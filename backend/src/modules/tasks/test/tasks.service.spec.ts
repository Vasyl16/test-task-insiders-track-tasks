import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { FindTasksQueryDto } from '../dto/find-tasks-query.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksRepository } from '../tasks.repository';
import { TasksService } from '../tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let repo: jest.Mocked<TasksRepository>;
  let realtime: jest.Mocked<RealtimeService>;

  const now = new Date('2026-01-01T00:00:00.000Z');
  const workspaceId = 'workspace-1';
  const projectId = 'project-1';
  const userId = 'user-1';
  const workspace = { id: workspaceId } as Workspace;
  const project = { id: projectId, workspaceId } as Project;
  const memberMembership = {
    workspaceId,
    userId,
    role: WorkspaceRole.MEMBER,
  } as WorkspaceMember;

  const task: Task = {
    id: 'task-1',
    projectId,
    title: 'Task 1',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigneeId: null,
    dueDate: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repo = {
      findWorkspaceById: jest.fn(),
      findProjectById: jest.fn(),
      findWorkspaceMembership: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findManyForProject: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TasksRepository>;

    realtime = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdated: jest.fn(),
      emitTaskDeleted: jest.fn(),
    } as unknown as jest.Mocked<RealtimeService>;

    service = new TasksService(repo, realtime);

    repo.findWorkspaceById.mockResolvedValue(workspace);
    repo.findProjectById.mockResolvedValue(project);
    repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
  });

  describe('create', () => {
    const dto: CreateTaskDto = { title: 'New task' };

    it('creates a task and emits a realtime event', async () => {
      repo.create.mockResolvedValue(task);

      const result = await service.create(workspaceId, projectId, userId, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          title: dto.title,
          createdBy: userId,
        }),
      );
      expect(realtime.emitTaskCreated).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({ id: task.id }),
        userId,
      );
      expect(result.id).toBe(task.id);
    });

    it('throws BadRequestException when the assignee is not a workspace member', async () => {
      repo.findWorkspaceMembership
        .mockResolvedValueOnce(memberMembership) // caller
        .mockResolvedValueOnce(null); // assignee

      await expect(
        service.create(workspaceId, projectId, userId, {
          ...dto,
          assigneeId: 'not-a-member',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the project does not belong to the workspace', async () => {
      repo.findProjectById.mockResolvedValue({
        ...project,
        workspaceId: 'other',
      });

      await expect(
        service.create(workspaceId, projectId, userId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForProject', () => {
    const baseQuery: FindTasksQueryDto = Object.assign(
      new FindTasksQueryDto(),
      {
        limit: 2,
      },
    );

    it('reports nextCursor null when there is no extra row', async () => {
      repo.findManyForProject.mockResolvedValue([task]);

      const result = await service.findAllForProject(
        workspaceId,
        projectId,
        userId,
        baseQuery,
      );

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('encodes a nextCursor when an extra row indicates more pages', async () => {
      const secondTask = { ...task, id: 'task-2' };
      repo.findManyForProject.mockResolvedValue([
        task,
        secondTask,
        { ...task, id: 'task-3' },
      ]);

      const result = await service.findAllForProject(
        workspaceId,
        projectId,
        userId,
        baseQuery,
      );

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('throws BadRequestException for a malformed cursor', async () => {
      await expect(
        service.findAllForProject(workspaceId, projectId, userId, {
          ...baseQuery,
          cursor: 'not-base64url-json',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the task belongs to another project', async () => {
      repo.findById.mockResolvedValue({ ...task, projectId: 'other' });

      await expect(
        service.findOne(workspaceId, projectId, task.id, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('writes a status change and emits an update event', async () => {
      repo.findById.mockResolvedValue(task);
      const updated = { ...task, status: TaskStatus.DONE };
      repo.update.mockResolvedValue(updated);
      const dto: UpdateTaskDto = { status: TaskStatus.DONE };

      const result = await service.update(
        workspaceId,
        projectId,
        task.id,
        userId,
        dto,
      );

      expect(repo.update).toHaveBeenCalledWith(task.id, dto, {
        userId,
        oldStatus: task.status,
        newStatus: TaskStatus.DONE,
      });
      expect(realtime.emitTaskUpdated).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({ id: task.id }),
        userId,
      );
      expect(result.status).toBe(TaskStatus.DONE);
    });

    it('omits statusChange when the status is unchanged', async () => {
      repo.findById.mockResolvedValue(task);
      repo.update.mockResolvedValue(task);

      await service.update(workspaceId, projectId, task.id, userId, {
        title: 'Renamed',
      });

      expect(repo.update).toHaveBeenCalledWith(
        task.id,
        { title: 'Renamed' },
        undefined,
      );
    });
  });

  describe('remove', () => {
    it('allows the creator to delete and emits a delete event', async () => {
      repo.findById.mockResolvedValue(task);
      repo.delete.mockResolvedValue(task);

      await service.remove(workspaceId, projectId, task.id, userId);

      expect(repo.delete).toHaveBeenCalledWith(task.id);
      expect(realtime.emitTaskDeleted).toHaveBeenCalledWith(
        projectId,
        task.id,
        userId,
      );
    });

    it('throws ForbiddenException for a non-creator, non-owner member', async () => {
      repo.findById.mockResolvedValue({ ...task, createdBy: 'someone-else' });

      await expect(
        service.remove(workspaceId, projectId, task.id, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
