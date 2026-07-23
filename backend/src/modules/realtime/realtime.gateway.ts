import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { WsExceptionFilter } from '@common/filters';
import { AuthService } from '@modules/auth/auth.service';
import { JoinProjectDto } from './dto/join-project.dto';
import type { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { RealtimeRepository } from './realtime.repository';

@WebSocketGateway()
@UseFilters(WsExceptionFilter)
// main.ts's app.useGlobalPipes(...) only binds to the HTTP adapter — a WS
// gateway needs its own @UsePipes() to get the same @MessageBody() DTO
// validation @Body() gets for free on every HTTP controller. Without this,
// JoinProjectDto's @IsUUID() checks were never actually running: a
// malformed payload (missing fields, a non-UUID string) passed straight
// through to the handler body instead of being rejected up front.
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
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
  //
  // authPromise is stored synchronously (before the verification it wraps
  // resolves) so any message handler — handleJoin below — can await it and
  // reliably see the final client.data.user, instead of racing a client
  // that emits its first message right after the transport connects, before
  // this async verification has actually finished.
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    client.data.authPromise = this.authenticate(client, token);
    await client.data.authPromise;
  }

  private async authenticate(
    client: AuthenticatedSocket,
    token: string,
  ): Promise<void> {
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
  //
  // The returned value becomes the ack payload for a client that emitted
  // 'project:join' with a callback (@nestjs/platform-socket.io sends a
  // handler's return value through that callback automatically) — every
  // exit path now reports success/failure explicitly instead of the caller
  // just never hearing back when a join is refused.
  @SubscribeMessage('project:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinProjectDto,
  ): Promise<{ status: 'ok' } | { status: 'error'; message: string }> {
    try {
      // See AuthenticatedSocket.authPromise — without this, a join emitted
      // right after 'connect' can lose the race against handleConnection's
      // still-in-flight verification and see client.data.user unset even
      // for a perfectly valid, authenticated session.
      if (client.data.authPromise) {
        await client.data.authPromise;
      }

      const user = client.data.user;
      if (!user) {
        client.disconnect(true);
        return { status: 'error', message: 'Not authenticated' };
      }

      const workspace = await this.realtimeRepository.findWorkspaceById(
        dto.workspaceId,
      );
      if (!workspace) {
        return { status: 'error', message: 'Workspace not found' };
      }

      const project = await this.realtimeRepository.findProjectById(
        dto.projectId,
      );
      if (!project || project.workspaceId !== dto.workspaceId) {
        return { status: 'error', message: 'Project not found' };
      }

      const membership = await this.realtimeRepository.findWorkspaceMembership(
        dto.workspaceId,
        user.id,
      );
      if (!membership) {
        return {
          status: 'error',
          message: 'You are not a member of this workspace',
        };
      }

      await client.join(RealtimeGateway.projectRoom(dto.projectId));
      return { status: 'ok' };
    } catch (error) {
      this.logger.warn(
        `project:join failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { status: 'error', message: 'Failed to join project' };
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
