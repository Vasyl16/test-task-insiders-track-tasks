import { UserResponseDto } from './user-response.dto';

export class RegisterResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;

  constructor(data: {
    user: UserResponseDto;
    accessToken: string;
    refreshToken: string;
  }) {
    this.user = data.user;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }
}
