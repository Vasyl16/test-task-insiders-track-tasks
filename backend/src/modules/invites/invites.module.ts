import { Module } from '@nestjs/common';
import { EmailModule } from '@modules/email/email.module';
import { InvitesController } from './invites.controller';
import { InvitesRepository } from './invites.repository';
import { InvitesService } from './invites.service';
import { WorkspaceInvitesController } from './workspace-invites.controller';

@Module({
  imports: [EmailModule],
  controllers: [InvitesController, WorkspaceInvitesController],
  providers: [InvitesService, InvitesRepository],
})
export class InvitesModule {}
