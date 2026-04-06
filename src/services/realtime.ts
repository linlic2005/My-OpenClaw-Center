import { API_BASE_URL, getAccessToken } from '@/services/api-client';
import type { LogEntry } from '@/types';

export interface RealtimeEvent {
  type: string;
  channel: string;
  data: unknown;
  timestamp: string;
}

type ChannelHandler = (event: RealtimeEvent) => void;
type LogHandler = (entry: LogEntry) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;
  private channelHandlers = new Map<string, Set<ChannelHandler>>();
  private logHandlers = new Set<LogHandler>();
  private logsAbortController: AbortController | null = null;

  subscribeChannel(channel: string, handler: ChannelHandler): () => void {
    const handlers = this.channelHandlers.get(channel) || new Set<ChannelHandler>();
    handlers.add(handler);
    this.channelHandlers.set(channel, handlers);
    this.connectWebSocket();
    this.send({ type: 'subscribe', channel });

    return () => {
      const currentHandlers = this.channelHandlers.get(channel);
      if (!currentHandlers) return;

      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        this.channelHandlers.delete(channel);
        this.send({ type: 'unsubscribe', channel });
      }

      this.cleanupIfIdle();
    };
  }

  subscribeLogs(handler: LogHandler): () => void {
    this.logHandlers.add(handler);
    if (this.logHandlers.size === 1) {
      void this.startLogsStream();
    }

    return () => {
      this.logHandlers.delete(handler);
      if (this.logHandlers.size === 0) {
        this.logsAbortController?.abort();
        this.logsAbortController = null;
      }
      this.cleanupIfIdle();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.logsAbortController?.abort();
    this.logsAbortController = null;
    this.ws?.close();
    this.ws = null;
  }

  private connectWebSocket(): void {
    const token = getAccessToken();
    if (!token || this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    const wsBase = API_BASE_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      for (const channel of this.channelHandlers.keys()) {
        this.send({ type: 'subscribe', channel });
      }
    };

    this.ws.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RealtimeEvent;
        if (!event.channel) return;
        const handlers = this.channelHandlers.get(event.channel);
        if (!handlers) return;
        handlers.forEach((handler) => handler(event));
      } catch (error) {
        console.error('Failed to parse realtime event:', error);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.shouldReconnect && this.channelHandlers.size > 0) {
        this.reconnectTimer = window.setTimeout(() => this.connectWebSocket(), 2000);
      }
    };
  }

  private async startLogsStream(): Promise<void> {
    const token = getAccessToken();
    if (!token || this.logsAbortController) return;

    this.logsAbortController = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/logs/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: this.logsAbortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to connect to log stream: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ') && currentEvent === 'log') {
            const entry = JSON.parse(line.slice(6)) as LogEntry;
            this.logHandlers.forEach((handler) => handler(entry));
            currentEvent = '';
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Log stream disconnected:', error);
        if (this.logHandlers.size > 0) {
          window.setTimeout(() => void this.startLogsStream(), 2000);
        }
      }
    } finally {
      this.logsAbortController = null;
    }
  }

  private send(payload: { type: 'subscribe' | 'unsubscribe'; channel: string }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private cleanupIfIdle(): void {
    if (this.channelHandlers.size === 0 && this.logHandlers.size === 0) {
      this.disconnect();
    }
  }
}

export const realtimeClient = new RealtimeClient();
