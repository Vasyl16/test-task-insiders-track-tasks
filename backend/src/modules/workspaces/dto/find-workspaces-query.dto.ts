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

export type WorkspaceSortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type OwnershipFilter = 'all' | 'mine' | 'other';

export class FindWorkspacesQueryDto {
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

  // Case-insensitive substring match against the workspace name.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sortBy: WorkspaceSortBy = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';

  // 'mine': the caller owns the workspace. 'other': the caller is a member
  // but not the owner. 'all' (default): no ownership restriction.
  @IsOptional()
  @IsIn(['all', 'mine', 'other'])
  ownership: OwnershipFilter = 'all';
}
