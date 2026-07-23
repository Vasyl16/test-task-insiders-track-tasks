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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserResponseDto } from '@modules/auth/dto/user-response.dto';
import { CommentsService } from './comments.service';
import { CommentListResponseDto } from './dto/comment-list-response.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(
  'workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments',
)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.create(
      workspaceId,
      projectId,
      taskId,
      user.id,
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query() query: FindCommentsQueryDto,
  ): Promise<CommentListResponseDto> {
    return this.commentsService.findAllForTask(
      workspaceId,
      projectId,
      taskId,
      user.id,
      query,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.update(
      workspaceId,
      projectId,
      taskId,
      id,
      user.id,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: UserResponseDto,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commentsService.remove(
      workspaceId,
      projectId,
      taskId,
      id,
      user.id,
    );
  }
}
