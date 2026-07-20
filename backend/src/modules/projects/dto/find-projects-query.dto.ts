import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type ProjectSortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type OwnershipFilter = 'all' | 'mine' | 'other';

export class FindProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  // Case-insensitive substring match against the project name.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sortBy: ProjectSortBy = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';

  // 'mine': the caller created the project. 'other': created by someone
  // else. 'all' (default): no restriction.
  @IsOptional()
  @IsIn(['all', 'mine', 'other'])
  ownership: OwnershipFilter = 'all';
}
