import { WorkspaceMemberResponseDto } from './workspace-member-response.dto';

export class WorkspaceMemberListResponseDto {
  items: WorkspaceMemberResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(
    items: WorkspaceMemberResponseDto[],
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
