import { z } from 'zod'
import { taskPriorityValues, taskStatusValues } from '../../../entities/task/model/task'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  status: z.enum(taskStatusValues),
  priority: z.enum(taskPriorityValues),
  assigneeId: z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
