import { Injectable } from '@nestjs/common';
import { TaskResponseDto } from '@modules/tasks/dto/task-response.dto';
import { TaskDeletedEventDto, TaskEventDto } from './dto/task-event.dto';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitTaskCreated(
    projectId: string,
    task: TaskResponseDto,
    actorUserId: string,
  ): void {
    this.gateway.server
      .to(RealtimeGateway.projectRoom(projectId))
      .emit('task:created', new TaskEventDto({ projectId, task, actorUserId }));
  }

  emitTaskUpdated(
    projectId: string,
    task: TaskResponseDto,
    actorUserId: string,
  ): void {
    this.gateway.server
      .to(RealtimeGateway.projectRoom(projectId))
      .emit('task:updated', new TaskEventDto({ projectId, task, actorUserId }));
  }

  emitTaskDeleted(
    projectId: string,
    taskId: string,
    actorUserId: string,
  ): void {
    this.gateway.server
      .to(RealtimeGateway.projectRoom(projectId))
      .emit(
        'task:deleted',
        new TaskDeletedEventDto({ projectId, taskId, actorUserId }),
      );
  }
}
