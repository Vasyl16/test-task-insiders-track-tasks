import type { Socket } from 'socket.io';
import type { UserResponseDto } from '@modules/auth/dto/user-response.dto';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: UserResponseDto;
    // Set synchronously in handleConnection, before the JWT/DB verification
    // it wraps actually resolves. A client can (and typically does) emit
    // 'project:join' immediately after the transport-level 'connect' event,
    // which races ahead of this still-in-flight verification — any handler
    // that reads `data.user` must await this first or it'll see it unset
    // even for a perfectly valid session.
    authPromise?: Promise<void>;
  };
}
