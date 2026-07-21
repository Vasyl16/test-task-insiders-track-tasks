import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { FindWorkspaceMembersQueryDto } from './dto/find-workspace-members-query.dto';
import { FindWorkspacesQueryDto } from './dto/find-workspaces-query.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceListResponseDto } from './dto/workspace-list-response.dto';
import { WorkspaceMemberListResponseDto } from './dto/workspace-member-list-response.dto';
import { WorkspaceMemberResponseDto } from './dto/workspace-member-response.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspacesRepository } from './workspaces.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const OWNER_ONLY_MESSAGE = 'Only the workspace owner can perform this action';
const MEMBER_NOT_FOUND_MESSAGE = 'Member not found';
const CANNOT_REMOVE_OWNER_MESSAGE = 'The workspace owner cannot be removed';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  async create(
    ownerId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspacesRepository.createWithOwner({
      name: dto.name,
      description: dto.description,
      ownerId,
    });

    return new WorkspaceResponseDto(workspace);
  }

  async findAllForUser(
    userId: string,
    query: FindWorkspacesQueryDto,
  ): Promise<WorkspaceListResponseDto> {
    const skip = (query.page - 1) * query.limit;
    const filters = { search: query.search, ownership: query.ownership };
    const [workspaces, total] = await Promise.all([
      this.workspacesRepository.findManyForUser(userId, {
        skip,
        take: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        ...filters,
      }),
      this.workspacesRepository.countForUser(userId, filters),
    ]);

    return new WorkspaceListResponseDto(
      workspaces.map((workspace) => new WorkspaceResponseDto(workspace)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string, userId: string): Promise<WorkspaceResponseDto> {
    const workspace = await this.getWorkspaceOrThrow(id);
    await this.assertMember(id, userId);

    return new WorkspaceResponseDto(workspace);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    await this.getWorkspaceOrThrow(id);
    await this.assertOwner(id, userId);

    const workspace = await this.workspacesRepository.update(id, dto);
    return new WorkspaceResponseDto(workspace);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getWorkspaceOrThrow(id);
    await this.assertOwner(id, userId);

    await this.workspacesRepository.delete(id);
  }

  async listMembers(
    workspaceId: string,
    userId: string,
    query: FindWorkspaceMembersQueryDto,
  ): Promise<WorkspaceMemberListResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const skip = (query.page - 1) * query.limit;
    const [members, total] = await Promise.all([
      this.workspacesRepository.findMembersForWorkspace(workspaceId, {
        skip,
        take: query.limit,
      }),
      this.workspacesRepository.countMembersForWorkspace(workspaceId),
    ]);

    return new WorkspaceMemberListResponseDto(
      members.map((member) => new WorkspaceMemberResponseDto(member)),
      total,
      query.page,
      query.limit,
    );
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    currentUserId: string,
  ): Promise<void> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertOwner(workspaceId, currentUserId);

    if (targetUserId === workspace.ownerId) {
      throw new BadRequestException(CANNOT_REMOVE_OWNER_MESSAGE);
    }

    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      targetUserId,
    );
    if (!membership) {
      throw new NotFoundException(MEMBER_NOT_FOUND_MESSAGE);
    }

    await this.workspacesRepository.deleteMembership(workspaceId, targetUserId);
  }

  private async getWorkspaceOrThrow(id: string): Promise<Workspace> {
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
    return workspace;
  }

  private async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
    return membership;
  }

  private async assertOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.assertMember(workspaceId, userId);
    if (membership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(OWNER_ONLY_MESSAGE);
    }
  }
}
