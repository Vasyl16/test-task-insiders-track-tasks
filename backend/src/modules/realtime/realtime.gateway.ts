import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { AuthService } from '@modules/auth/auth.service';
import { JoinProjectDto } from './dto/join-project.dto';
import type { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { RealtimeRepository } from './realtime.repository';

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeRepository: RealtimeRepository,
  ) {}

  static projectRoom(projectId: string): string {
    return `project:${projectId}`;
  }

  // No HTTP request/Authorization header exists on a socket handshake, so
  // AuthGuard('jwt') can't be reused here — the token is verified manually
  // via AuthService.verifyAccessToken, the same JWT-verification logic
  // JwtStrategy uses for HTTP requests.
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      client.data.user = await this.authService.verifyAccessToken(token);
    } catch {
      client.disconnect(true);
    }
  }

  // Every branch below is wrapped so nothing ever throws out of this
  // handler — the app's global AllExceptionsFilter only handles the HTTP
  // context (switchToHttp()) and would itself throw if it ever had to
  // handle a ws-context exception.
  @SubscribeMessage('project:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinProjectDto,
  ): Promise<void> {
    try {
      const user = client.data.user;
      if (!user) {
        client.disconnect(true);
        return;
      }

      const workspace = await this.realtimeRepository.findWorkspaceById(
        dto.workspaceId,
      );
      if (!workspace) {
        return;
      }

      const project = await this.realtimeRepository.findProjectById(
        dto.projectId,
      );
      if (!project || project.workspaceId !== dto.workspaceId) {
        return;
      }

      const membership = await this.realtimeRepository.findWorkspaceMembership(
        dto.workspaceId,
        user.id,
      );
      if (!membership) {
        return;
      }

      await client.join(RealtimeGateway.projectRoom(dto.projectId));
    } catch (error) {
      this.logger.warn(
        `project:join failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @SubscribeMessage('project:leave')
  handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinProjectDto,
  ): void {
    void client.leave(RealtimeGateway.projectRoom(dto.projectId));
  }
}
