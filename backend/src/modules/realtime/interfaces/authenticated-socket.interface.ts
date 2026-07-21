import type { Socket } from 'socket.io';
import type { UserResponseDto } from '@modules/auth/dto/user-response.dto';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: UserResponseDto;
  };
}
