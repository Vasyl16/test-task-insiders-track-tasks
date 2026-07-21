import { TaskResponseDto } from '@modules/tasks/dto/task-response.dto';

// Emitted for task:created and task:updated — a full task row is always
// available for both.
export class TaskEventDto {
  projectId: string;
  task: TaskResponseDto;
  actorUserId: string;

  constructor(data: {
    projectId: string;
    task: TaskResponseDto;
    actorUserId: string;
  }) {
    this.projectId = data.projectId;
    this.task = data.task;
    this.actorUserId = data.actorUserId;
  }
}

// task:deleted necessarily carries a slimmer payload — the row is gone by
// the time this fires, only its id survives.
export class TaskDeletedEventDto {
  projectId: string;
  taskId: string;
  actorUserId: string;

  constructor(data: {
    projectId: string;
    taskId: string;
    actorUserId: string;
  }) {
    this.projectId = data.projectId;
    this.taskId = data.taskId;
    this.actorUserId = data.actorUserId;
  }
}
