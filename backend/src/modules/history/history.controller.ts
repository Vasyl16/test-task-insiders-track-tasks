import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { FindHistoryQueryDto } from './dto/find-history-query.dto';
import { TaskHistoryListResponseDto } from './dto/task-history-list-response.dto';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks/:taskId/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query() query: FindHistoryQueryDto,
  ): Promise<TaskHistoryListResponseDto> {
    return this.historyService.findAllForTask(
      workspaceId,
      projectId,
      taskId,
      user.id,
      query,
    );
  }
}
