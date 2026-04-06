// Unified event frame format for frontend WebSocket communication

// Client → Server
export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel: string;
}

// Server → Client
export interface ServerEvent {
  type: string;
  channel: string;
  data: unknown;
  timestamp: string;
}

// Valid channels
export const VALID_CHANNELS = ['agents', 'logs', 'office', 'metrics', 'system'] as const;
export type StaticChannel = typeof VALID_CHANNELS[number];

// Dynamic channels match pattern like "chat:session-id"
export function isValidChannel(channel: string): boolean {
  if (VALID_CHANNELS.includes(channel as StaticChannel)) return true;
  if (channel.startsWith('chat:')) return true;
  return false;
}
