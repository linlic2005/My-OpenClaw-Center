import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { eventBus } from './event-bus.js';
import { isValidChannel, type ClientMessage, type ServerEvent } from './realtime.types.js';
import { logger } from '../shared/logger.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { TokenPayload } from '../modules/auth/auth.types.js';

interface ClientState {
  ws: WebSocket;
  channels: Set<string>;
  user?: TokenPayload;
  unsubscribers: Map<string, () => void>;
}

const clients = new Map<WebSocket, ClientState>();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via query param: ws://host/ws?token=xxx
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    let user: TokenPayload | undefined;
    if (token) {
      try {
        user = jwt.verify(token, config.jwt.secret) as TokenPayload;
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    const state: ClientState = { ws, channels: new Set(), user, unsubscribers: new Map() };
    clients.set(ws, state);

    logger.info(`WS client connected (user: ${user?.username || 'anonymous'})`);

    ws.on('message', (raw) => {
      try {
        const msg: ClientMessage = JSON.parse(raw.toString());
        handleClientMessage(state, msg);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      // Clean up all subscriptions
      for (const unsub of state.unsubscribers.values()) {
        unsub();
      }
      clients.delete(ws);
      logger.info(`WS client disconnected (user: ${user?.username || 'anonymous'})`);
    });

    // Send welcome
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'system',
      data: { message: 'Connected to OpenClaw Realtime' },
      timestamp: new Date().toISOString(),
    }));
  });

  logger.info('WebSocket server ready on /ws');
}

function handleClientMessage(state: ClientState, msg: ClientMessage): void {
  switch (msg.type) {
    case 'subscribe': {
      if (!isValidChannel(msg.channel)) {
        state.ws.send(JSON.stringify({ type: 'error', message: `Invalid channel: ${msg.channel}` }));
        return;
      }
      if (state.channels.has(msg.channel)) return;

      state.channels.add(msg.channel);
      const unsub = eventBus.subscribe(msg.channel, (event: ServerEvent) => {
        if (state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify(event));
        }
      });
      state.unsubscribers.set(msg.channel, unsub);
      break;
    }

    case 'unsubscribe': {
      state.channels.delete(msg.channel);
      const unsub = state.unsubscribers.get(msg.channel);
      if (unsub) {
        unsub();
        state.unsubscribers.delete(msg.channel);
      }
      break;
    }

    case 'ping': {
      state.ws.send(JSON.stringify({
        type: 'pong',
        channel: 'system',
        data: null,
        timestamp: new Date().toISOString(),
      }));
      break;
    }
  }
}

// Broadcast to all clients subscribed to a channel
export function broadcast(channel: string, event: Omit<ServerEvent, 'channel' | 'timestamp'>): void {
  eventBus.emit(channel, event);
}
