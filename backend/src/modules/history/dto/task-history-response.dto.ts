import { TaskStatus } from '@prisma/client';

export class TaskHistoryResponseDto {
  id: string;
  taskId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  changedAt: Date;
  changedBy: {
    id: string;
    email: string;
  };

  constructor(entry: {
    id: string;
    taskId: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    changedAt: Date;
    changer: { id: string; email: string };
  }) {
    this.id = entry.id;
    this.taskId = entry.taskId;
    this.oldStatus = entry.oldStatus;
    this.newStatus = entry.newStatus;
    this.changedAt = entry.changedAt;
    this.changedBy = { id: entry.changer.id, email: entry.changer.email };
  }
}
