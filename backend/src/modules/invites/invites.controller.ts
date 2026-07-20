import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InvitesService } from './invites.service';

// Flat /invites routes for acting on invites *received* by the current
// user — distinct from the nested workspaces/:workspaceId/invites route
// (WorkspaceInvitesController) used to *send* one, since "my invites" spans
// every workspace, not just one.
@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('me')
  findMine(@CurrentUser() user: UserResponseDto): Promise<InviteResponseDto[]> {
    return this.invitesService.findAllForUser(user.id);
  }

  @Post(':id/accept')
  accept(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
  ): Promise<InviteResponseDto> {
    return this.invitesService.accept(id, user.id);
  }

  @Post(':id/decline')
  decline(
    @CurrentUser() user: UserResponseDto,
    @Param('id') id: string,
  ): Promise<InviteResponseDto> {
    return this.invitesService.decline(id, user.id);
  }
}
