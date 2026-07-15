export class WorkspaceResponseDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(workspace: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = workspace.id;
    this.name = workspace.name;
    this.description = workspace.description;
    this.ownerId = workspace.ownerId;
    this.createdAt = workspace.createdAt;
    this.updatedAt = workspace.updatedAt;
  }
}
