import { ProjectResponseDto } from './project-response.dto';

export class ProjectListResponseDto {
  items: ProjectResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(
    items: ProjectResponseDto[],
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
