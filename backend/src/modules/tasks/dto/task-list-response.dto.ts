import { TaskResponseDto } from './task-response.dto';

export class TaskListResponseDto {
  items: TaskResponseDto[];
  nextCursor: string | null;

  constructor(items: TaskResponseDto[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}
