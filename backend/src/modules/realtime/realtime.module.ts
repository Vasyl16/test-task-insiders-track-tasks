import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeRepository } from './realtime.repository';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeService, RealtimeRepository],
  exports: [RealtimeService],
})
export class RealtimeModule {}
