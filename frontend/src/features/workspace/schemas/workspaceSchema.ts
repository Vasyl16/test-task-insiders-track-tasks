import { z } from 'zod'

export const workspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>
