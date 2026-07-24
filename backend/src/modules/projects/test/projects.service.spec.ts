import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Project,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';
import { CreateProjectDto } from '../dto/create-project.dto';
import { FindProjectsQueryDto } from '../dto/find-projects-query.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsRepository } from '../projects.repository';
import { ProjectsService } from '../projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: jest.Mocked<ProjectsRepository>;

  const now = new Date('2026-01-01T00:00:00.000Z');
  const workspaceId = 'workspace-1';
  const userId = 'user-1';
  const workspace = { id: workspaceId } as Workspace;
  const ownerMembership = {
    workspaceId,
    userId,
    role: WorkspaceRole.OWNER,
  } as WorkspaceMember;
  const memberMembership = {
    workspaceId,
    userId,
    role: WorkspaceRole.MEMBER,
  } as WorkspaceMember;
  const project: Project = {
    id: 'project-1',
    workspaceId,
    name: 'Project 1',
    description: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repo = {
      findWorkspaceById: jest.fn(),
      findWorkspaceMembership: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findManyForWorkspace: jest.fn(),
      countForWorkspace: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProjectsRepository>;

    service = new ProjectsService(repo);
  });

  describe('create', () => {
    const dto: CreateProjectDto = { name: 'New project' };

    it('creates a project when the caller is a workspace member', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.create.mockResolvedValue(project);

      const result = await service.create(workspaceId, userId, dto);

      expect(repo.create).toHaveBeenCalledWith({
        workspaceId,
        name: dto.name,
        description: undefined,
        createdBy: userId,
      });
      expect(result.id).toBe(project.id);
    });

    it('throws NotFoundException when the workspace does not exist', async () => {
      repo.findWorkspaceById.mockResolvedValue(null);

      await expect(service.create(workspaceId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the caller is not a workspace member', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findWorkspaceMembership.mockResolvedValue(null);

      await expect(service.create(workspaceId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllForWorkspace', () => {
    it('paginates and maps results', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.findManyForWorkspace.mockResolvedValue([project]);
      repo.countForWorkspace.mockResolvedValue(1);
      const query: FindProjectsQueryDto = Object.assign(
        new FindProjectsQueryDto(),
        { page: 2, limit: 10 },
      );

      const result = await service.findAllForWorkspace(
        workspaceId,
        userId,
        query,
      );

      expect(repo.findManyForWorkspace).toHaveBeenCalledWith(
        workspaceId,
        userId,
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result).toMatchObject({ total: 1, page: 2, limit: 10 });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns the project when it belongs to the workspace', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.findById.mockResolvedValue(project);

      const result = await service.findOne(workspaceId, project.id, userId);

      expect(result.id).toBe(project.id);
    });

    it('throws NotFoundException when the project belongs to another workspace', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.findById.mockResolvedValue({ ...project, workspaceId: 'other' });

      await expect(
        service.findOne(workspaceId, project.id, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto: UpdateProjectDto = { name: 'Renamed' };

    it('allows the creator to update', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findById.mockResolvedValue(project);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.update.mockResolvedValue({ ...project, name: dto.name! });

      const result = await service.update(workspaceId, project.id, userId, dto);

      expect(repo.update).toHaveBeenCalledWith(project.id, dto);
      expect(result.name).toBe(dto.name);
    });

    it('allows the workspace owner to update someone else’s project', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findById.mockResolvedValue({
        ...project,
        createdBy: 'someone-else',
      });
      repo.findWorkspaceMembership.mockResolvedValue(ownerMembership);
      repo.update.mockResolvedValue({ ...project, name: dto.name! });

      await expect(
        service.update(workspaceId, project.id, userId, dto),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException for a non-creator, non-owner member', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findById.mockResolvedValue({
        ...project,
        createdBy: 'someone-else',
      });
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);

      await expect(
        service.update(workspaceId, project.id, userId, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the project when the caller is the creator', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findById.mockResolvedValue(project);
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);
      repo.delete.mockResolvedValue(project);

      await service.remove(workspaceId, project.id, userId);

      expect(repo.delete).toHaveBeenCalledWith(project.id);
    });

    it('throws ForbiddenException for a non-creator, non-owner member', async () => {
      repo.findWorkspaceById.mockResolvedValue(workspace);
      repo.findById.mockResolvedValue({
        ...project,
        createdBy: 'someone-else',
      });
      repo.findWorkspaceMembership.mockResolvedValue(memberMembership);

      await expect(
        service.remove(workspaceId, project.id, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
