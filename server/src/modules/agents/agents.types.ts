import { z } from 'zod';

export interface AgentDTO {
  id: string;
  name: string;
  model: string;
  status: string;
  avatar?: string;
  description?: string;
  tags?: string[];
  lastActive?: string;
  roomId?: string;
}

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  roomId: z.string().optional(),
});

export type CreateAgentDTO = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = createAgentSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
);

export type UpdateAgentDTO = z.infer<typeof updateAgentSchema>;
