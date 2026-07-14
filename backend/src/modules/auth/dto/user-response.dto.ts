export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;

  constructor(user: { id: string; email: string; createdAt: Date }) {
    this.id = user.id;
    this.email = user.email;
    this.createdAt = user.createdAt;
  }
}
