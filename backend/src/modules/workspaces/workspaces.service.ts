import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceMemberResponseDto } from './dto/workspace-member-response.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspacesRepository } from './workspaces.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const OWNER_ONLY_MESSAGE = 'Only the workspace owner can perform this action';
const USER_NOT_FOUND_MESSAGE = 'No user with this email was found';
const ALREADY_A_MEMBER_MESSAGE =
  'This user is already a member of the workspace';

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

  async findAllForUser(userId: string): Promise<WorkspaceResponseDto[]> {
    const workspaces = await this.workspacesRepository.findManyForUser(userId);
    return workspaces.map((workspace) => new WorkspaceResponseDto(workspace));
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
  ): Promise<WorkspaceMemberResponseDto[]> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspaceId, userId);

    const members =
      await this.workspacesRepository.findMembersForWorkspace(workspaceId);
    return members.map((member) => new WorkspaceMemberResponseDto(member));
  }

  async inviteMember(
    workspaceId: string,
    userId: string,
    dto: InviteMemberDto,
  ): Promise<WorkspaceMemberResponseDto> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.assertOwner(workspaceId, userId);

    const invitedUser = await this.workspacesRepository.findUserByEmail(
      dto.email,
    );
    if (!invitedUser) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }

    const existingMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      invitedUser.id,
    );
    if (existingMembership) {
      throw new ConflictException(ALREADY_A_MEMBER_MESSAGE);
    }

    const member = await this.workspacesRepository.addMember(
      workspaceId,
      invitedUser.id,
      WorkspaceRole.MEMBER,
    );

    return new WorkspaceMemberResponseDto(member);
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
