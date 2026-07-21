export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  constructor(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  }) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.createdAt = user.createdAt;
  }
}
