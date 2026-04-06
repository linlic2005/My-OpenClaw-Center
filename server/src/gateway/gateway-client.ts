import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

// Gateway protocol frame types
interface GwRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface GwResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
}

interface GwEvent {
  type: 'event';
  event: string;
  payload: unknown;
  seq?: number;
  stateVersion?: number;
}

type GwFrame = GwResponse | GwEvent;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private pending = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private tickIntervalMs = 15000;

  get isConnected(): boolean {
    return this.connected && this.authenticated;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = config.gateway.url.replace(/^http/, 'ws');
      logger.info(`[GatewayClient] Connecting to ${url}`);

      this.ws = new WebSocket(url);

      const connectTimeout = setTimeout(() => {
        reject(new Error('Gateway connection timeout'));
        this.ws?.close();
      }, config.gateway.timeout);

      this.ws.on('open', () => {
        logger.info('[GatewayClient] WebSocket open, waiting for challenge...');
      });

      this.ws.on('message', (data) => {
        let frame: GwFrame;
        try {
          frame = JSON.parse(data.toString());
        } catch {
          logger.warn('[GatewayClient] Invalid frame received');
          return;
        }

        // Handle connect challenge
        if (frame.type === 'event' && (frame as GwEvent).event === 'connect.challenge') {
          const challenge = (frame as GwEvent).payload as { nonce: string; ts: number };
          const _nonce = challenge.nonce; void _nonce; // reserved for device-signature auth
          this.sendConnect()
            .then(() => {
              clearTimeout(connectTimeout);
              this.connected = true;
              this.authenticated = true;
              this.reconnectAttempts = 0;
              this.startTick();
              logger.info('[GatewayClient] Connected and authenticated');
              resolve();
            })
            .catch((err) => {
              clearTimeout(connectTimeout);
              reject(err);
            });
          return;
        }

        // Handle responses
        if (frame.type === 'res') {
          const res = frame as GwResponse;
          const pending = this.pending.get(res.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(res.id);
            if (res.ok) {
              pending.resolve(res.payload);
            } else {
              pending.reject(new Error(res.error?.message || 'Gateway request failed'));
            }
          }
          return;
        }

        // Handle events
        if (frame.type === 'event') {
          const evt = frame as GwEvent;
          this.emit('gw:event', evt);
          this.emit(`gw:${evt.event}`, evt.payload);
        }
      });

      this.ws.on('close', (code) => {
        this.connected = false;
        this.authenticated = false;
        this.stopTick();
        clearTimeout(connectTimeout);

        // Reject all pending requests
        for (const [id, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new Error('Connection closed'));
          this.pending.delete(id);
        }

        logger.warn(`[GatewayClient] Disconnected (code: ${code})`);
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        logger.error(err, '[GatewayClient] WebSocket error');
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopTick();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  /** Send a req frame and wait for the correlated res frame */
  async request<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Gateway');
    }

    const id = uuidv4();
    const frame: GwRequest = { type: 'req', id, method, params };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, config.gateway.timeout);

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(frame));
    });
  }

  private async sendConnect(): Promise<void> {
    const id = uuidv4();
    const connectReq: GwRequest = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-web-console',
          version: '0.1.0',
          platform: 'server',
          mode: 'operator',
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: config.gateway.token },
        locale: 'en-US',
        userAgent: 'openclaw-web-console/0.1.0',
      },
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Gateway connect handshake timeout'));
      }, config.gateway.timeout);

      this.pending.set(id, {
        resolve: () => { resolve(); },
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(connectReq));
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;

    logger.info(`[GatewayClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        this.emit('reconnected');
      } catch (err) {
        logger.error(err, '[GatewayClient] Reconnect failed');
      }
    }, delay);
  }

  private startTick(): void {
    this.stopTick();
    this.tickTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.tickIntervalMs);
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}
