import { EventEmitter } from 'events';
import type { ServerEvent } from './realtime.types.js';

class EventBus extends EventEmitter {
  emit(channel: string, event: Omit<ServerEvent, 'channel' | 'timestamp'>): boolean {
    const fullEvent: ServerEvent = {
      ...event,
      channel,
      timestamp: new Date().toISOString(),
    };
    return super.emit(channel, fullEvent);
  }

  subscribe(channel: string, handler: (event: ServerEvent) => void): () => void {
    this.on(channel, handler);
    return () => { this.off(channel, handler); };
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(100);
