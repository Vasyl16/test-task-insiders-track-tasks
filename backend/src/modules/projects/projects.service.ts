import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { cacheKeys } from '@redis/cache-keys';
import { RedisService } from '@redis/redis.service';
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
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly redisService: RedisService,
  ) {}

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

    // The new project shows up in every member's list (at least under the
    // default 'all' ownership filter), not just the creator's - invalidate
    // everyone's cached pages rather than only the actor's.
    await this.invalidateListsForAllMembers(workspaceId);

    return new ProjectResponseDto(project);
  }

  async findAllForWorkspace(
    workspaceId: string,
    userId: string,
    query: FindProjectsQueryDto,
  ): Promise<ProjectListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const cacheKey = cacheKeys.projectList(workspaceId, userId, { ...query });
    const cached =
      await this.redisService.get<ProjectListResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (query.page - 1) * query.limit;
    const filters = { search: query.search, ownership: query.ownership };
    const [projects, total] = await Promise.all([
      this.projectsRepository.findManyForWorkspace(workspaceId, userId, {
        skip,
        take: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        ...filters,
      }),
      this.projectsRepository.countForWorkspace(workspaceId, userId, filters),
    ]);

    const result = new ProjectListResponseDto(
      projects.map((project) => new ProjectResponseDto(project)),
      total,
      query.page,
      query.limit,
    );
    await this.redisService.set(cacheKey, result);
    return result;
  }

  async findOne(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const cacheKey = cacheKeys.projectDetail(workspaceId, id);
    const cached = await this.redisService.get<ProjectResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const project = await this.getProjectOrThrow(workspaceId, id);
    const dto = new ProjectResponseDto(project);
    await this.redisService.set(cacheKey, dto);
    return dto;
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

    await this.redisService.del(cacheKeys.projectDetail(workspaceId, id));
    await this.invalidateListsForAllMembers(workspaceId);

    return new ProjectResponseDto(updated);
  }

  async remove(workspaceId: string, id: string, userId: string): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    const project = await this.getProjectOrThrow(workspaceId, id);
    await this.assertCreatorOrOwner(workspaceId, userId, project);

    await this.projectsRepository.delete(id);

    await this.redisService.del(cacheKeys.projectDetail(workspaceId, id));
    await this.invalidateListsForAllMembers(workspaceId);
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

  private async invalidateListsForAllMembers(
    workspaceId: string,
  ): Promise<void> {
    const memberIds =
      await this.projectsRepository.findWorkspaceMemberUserIds(workspaceId);
    await Promise.all(
      memberIds.map((memberId) =>
        this.redisService.delByPrefix(
          cacheKeys.projectListPrefix(workspaceId, memberId),
        ),
      ),
    );
  }
}
