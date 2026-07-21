import { IsUUID } from 'class-validator';

// Used for both project:join and project:leave — same shape either way.
export class JoinProjectDto {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  projectId!: string;
}
