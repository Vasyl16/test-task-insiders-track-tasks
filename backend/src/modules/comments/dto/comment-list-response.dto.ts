import { CommentResponseDto } from './comment-response.dto';

export class CommentListResponseDto {
  items: CommentResponseDto[];
  nextCursor: string | null;

  constructor(items: CommentResponseDto[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}
