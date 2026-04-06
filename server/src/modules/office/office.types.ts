import { z } from 'zod';

export interface RoomDTO {
  id: string;
  name: string;
  background: string;
  type: 'public' | 'private';
  furniture?: Record<string, number>;
}

export interface AgentAnchorDTO {
  agentId: string;
  roomId: string;
  anchors: {
    idle: { x: number; y: number };
    work: { x: number; y: number };
    sleep: { x: number; y: number };
  };
}

export const updateAnchorSchema = z.object({
  roomId: z.string().min(1),
  anchors: z.object({
    idle: z.object({ x: z.number(), y: z.number() }),
    work: z.object({ x: z.number(), y: z.number() }),
    sleep: z.object({ x: z.number(), y: z.number() }),
  }),
});

export const createRoomSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  background: z.string().default('/assets/office-bg.png'),
  type: z.enum(['public', 'private']),
  furniture: z.record(z.number()).optional(),
});
