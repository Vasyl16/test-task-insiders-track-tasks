import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { FindProjectsQueryDto } from './dto/find-projects-query.dto';
import { ProjectListResponseDto } from './dto/project-list-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const NOT_ALLOWED_MESSAGE =
  'Only the project creator or workspace owner can perform this action';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const project = await this.projectsRepository.create({
      workspaceId,
      name: dto.name,
      description: dto.description,
      createdBy: userId,
    });

    return new ProjectResponseDto(project);
  }

  async findAllForWorkspace(
    workspaceId: string,
    userId: string,
    query: FindProjectsQueryDto,
  ): Promise<ProjectListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const skip = (query.page - 1) * query.limit;
    const [projects, total] = await Promise.all([
      this.projectsRepository.findManyForWorkspace(workspaceId, {
        skip,
        take: query.limit,
      }),
      this.projectsRepository.countForWorkspace(workspaceId),
    ]);

    return new ProjectListResponseDto(
      projects.map((project) => new ProjectResponseDto(project)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);
    const project = await this.getProjectOrThrow(workspaceId, id);

    return new ProjectResponseDto(project);
  }

  async update(
    workspaceId: string,
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    const project = await this.getProjectOrThrow(workspaceId, id);
    await this.assertCreatorOrOwner(workspaceId, userId, project);

    const updated = await this.projectsRepository.update(id, dto);
    return new ProjectResponseDto(updated);
  }

  async remove(workspaceId: string, id: string, userId: string): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    const project = await this.getProjectOrThrow(workspaceId, id);
    await this.assertCreatorOrOwner(workspaceId, userId, project);

    await this.projectsRepository.delete(id);
  }

  private async getWorkspaceOrThrow(workspaceId: string): Promise<void> {
    const workspace =
      await this.projectsRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
  }

  private async getProjectOrThrow(
    workspaceId: string,
    id: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findById(id);
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }
    return project;
  }

  private async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.projectsRepository.findWorkspaceMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
    return membership;
  }

  private async assertCreatorOrOwner(
    workspaceId: string,
    userId: string,
    project: Project,
  ): Promise<void> {
    const membership = await this.assertMember(workspaceId, userId);
    const isCreator = project.createdBy === userId;
    const isOwner = membership.role === WorkspaceRole.OWNER;

    if (!isCreator && !isOwner) {
      throw new ForbiddenException(NOT_ALLOWED_MESSAGE);
    }
  }
}
