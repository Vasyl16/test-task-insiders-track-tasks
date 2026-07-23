import { TaskHistoryResponseDto } from './task-history-response.dto';

export class TaskHistoryListResponseDto {
  items: TaskHistoryResponseDto[];
  nextCursor: string | null;

  constructor(items: TaskHistoryResponseDto[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}
