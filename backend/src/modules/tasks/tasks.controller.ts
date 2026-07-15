import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(workspaceId, projectId, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.findAllForProject(workspaceId, projectId, user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(workspaceId, projectId, id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(workspaceId, projectId, id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.remove(workspaceId, projectId, id, user.id);
  }
}
