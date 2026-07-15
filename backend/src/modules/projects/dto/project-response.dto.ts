export class ProjectResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(project: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = project.id;
    this.workspaceId = project.workspaceId;
    this.name = project.name;
    this.description = project.description;
    this.createdBy = project.createdBy;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;
  }
}
