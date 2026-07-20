import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InvitesService } from './invites.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/invites')
export class WorkspaceInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  create(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.invitesService.create(workspaceId, user.id, dto);
  }
}
