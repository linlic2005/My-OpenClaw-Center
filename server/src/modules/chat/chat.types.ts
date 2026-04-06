import { z } from 'zod';

export interface SessionDTO {
  id: string;
  agentId: string;
  userId: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messages?: MessageDTO[];
}

export interface MessageDTO {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  timestamp: string;
}

export const createSessionSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
});
