export class CommentResponseDto {
  id: string;
  taskId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    email: string;
    name: string;
  };

  constructor(comment: {
    id: string;
    taskId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; email: string; name: string };
  }) {
    this.id = comment.id;
    this.taskId = comment.taskId;
    this.content = comment.content;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
    this.author = {
      id: comment.author.id,
      email: comment.author.email,
      name: comment.author.name,
    };
  }
}
