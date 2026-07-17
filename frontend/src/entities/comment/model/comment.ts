export interface Comment {
  id: string
  taskId: string
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    email: string
    name: string
  }
}
