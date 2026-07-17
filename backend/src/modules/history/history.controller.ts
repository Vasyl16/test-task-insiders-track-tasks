import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { TaskHistoryResponseDto } from './dto/task-history-response.dto';
import { HistoryService } from './history.service';

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
  ): Promise<TaskHistoryResponseDto[]> {
    return this.historyService.findAllForTask(
      workspaceId,
      projectId,
      taskId,
      user.id,
    );
  }
}
