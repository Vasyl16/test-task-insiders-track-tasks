import { WorkspaceResponseDto } from './workspace-response.dto';

export class WorkspaceListResponseDto {
  items: WorkspaceResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(
    items: WorkspaceResponseDto[],
    total: number,
    page: number,
    limit: number,
  ) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.max(1, Math.ceil(total / limit));
  }
}
