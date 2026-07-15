import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceMemberResponseDto } from './dto/workspace-member-response.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspacesService } from './workspaces.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspacesService.create(user.id, dto);
  }

  @Get()
  findMine(
    @CurrentUser() user: UserResponseDto,
  ): Promise<WorkspaceResponseDto[]> {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspacesService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspacesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
  ): Promise<void> {
    return this.workspacesService.remove(id, user.id);
  }

  @Get(':id/members')
  listMembers(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
  ): Promise<WorkspaceMemberResponseDto[]> {
    return this.workspacesService.listMembers(id, user.id);
  }

  @Post(':id/members')
  inviteMember(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.workspacesService.inviteMember(id, user.id, dto);
  }
}
