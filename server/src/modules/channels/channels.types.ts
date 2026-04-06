import { z } from 'zod';

const channelTypeSchema = z.enum(['discord', 'web', 'slack', 'telegram']);
const channelStatusSchema = z.enum(['connected', 'disconnected', 'error']);

export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: channelTypeSchema,
  status: channelStatusSchema.optional(),
});

export const updateChannelSchema = createChannelSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
);
