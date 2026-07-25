import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InvitesService } from './invites.service';

@ApiTags('invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/invites')
export class WorkspaceInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiOperation({
    summary: 'Invite a user to this workspace by email',
    description:
      'The email must belong to an already-registered account — invites ' +
      'to not-yet-registered emails are not supported in this MVP; see ' +
      'the README\'s "Workspace invites" section for the reasoning.',
  })
  @Post()
  create(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.invitesService.create(workspaceId, user.id, dto);
  }
}
