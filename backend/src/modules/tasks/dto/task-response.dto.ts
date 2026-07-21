import { TaskPriority, TaskStatus } from '@prisma/client';

export class TaskResponseDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(task: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = task.id;
    this.projectId = task.projectId;
    this.title = task.title;
    this.description = task.description;
    this.status = task.status;
    this.priority = task.priority;
    this.assigneeId = task.assigneeId;
    this.dueDate = task.dueDate;
    this.createdBy = task.createdBy;
    this.createdAt = task.createdAt;
    this.updatedAt = task.updatedAt;
  }
}
