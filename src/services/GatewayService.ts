import { createId } from "../lib/utils";
import type {
  AgentProfile,
  ConnectionStatus,
  GatewayHealth,
  GatewayPushEvent,
  GatewayRequest,
  GatewayResponse,
  QueuedRequest
} from "../types";

type StatusHandler = (status: ConnectionStatus) => void;
type StateHandler = (state: GatewayStateSnapshot) => void;
type PushHandler<TPayload = unknown> = (event: GatewayPushEvent<TPayload>) => void;

interface PendingRequest<TPayload = unknown> {
  resolve: (value: TPayload) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
}

interface QueueEntry<TPayload = unknown> extends QueuedRequest {
  timeoutMs: number;
  resolve: (value: TPayload) => void;
  reject: (reason?: unknown) => void;
}

interface SendOptions {
  queueIfOffline?: boolean;
  timeoutMs?: number;
}

export interface GatewayStateSnapshot {
  status: ConnectionStatus;
  reconnectAttempt: number;
  offlineQueue: QueuedRequest[];
  url: string;
}

export class GatewayRequestError extends Error {
  code: number;
  payload?: unknown;

  constructor(code: number, message: string, payload?: unknown) {
    super(message);
    this.name = "GatewayRequestError";
    this.code = code;
    this.payload = payload;
  }
}

const DEFAULT_URL = import.meta.env.VITE_WS_URL ?? "ws://192.168.123.115:18789";
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 30_000;

const iconMap: Record<string, string> = {
  code: "💻",
  coding: "💻",
  search: "🔎",
  research: "🔎",
  write: "✍️",
  writing: "✍️",
  design: "🎨",
  studio: "🧪",
  robot: "🤖"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAgentProfile(raw: unknown): AgentProfile {
  const record = isRecord(raw) ? raw : {};
  const iconKey = String(record.icon ?? "robot").toLowerCase();

  return {
    id: String(record.id ?? createId("agent")),
    name: String(record.name ?? "Agent"),
    description: String(record.description ?? ""),
    icon: iconMap[iconKey] ?? String(record.icon ?? "🤖"),
    enabled: record.enabled === undefined ? true : Boolean(record.enabled),
    installed: record.installed === undefined ? true : Boolean(record.installed)
  };
}

export class GatewayService {
  private socket: WebSocket | null = null;
  private url = DEFAULT_URL;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempt = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private manualDisconnect = false;
  private connectPromise: Promise<void> | null = null;
  private statusListeners = new Set<StatusHandler>();
  private stateListeners = new Set<StateHandler>();
  private pushHandlers = new Map<string, Set<PushHandler>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private offlineQueue: QueueEntry[] = [];
  private agentsCache: AgentProfile[] = [];

  setUrl(url: string): void {
    const nextUrl = url.trim();
    if (!nextUrl || nextUrl === this.url) return;
    this.url = nextUrl;
    this.emitState(this.status);
  }

  getUrl(): string {
    return this.url;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  getOfflineQueue(): QueuedRequest[] {
    return this.offlineQueue.map(({ id, type, payload, timestamp, retries }) => ({
      id,
      type,
      payload,
      timestamp,
      retries
    }));
  }

  getStateSnapshot(): GatewayStateSnapshot {
    return {
      status: this.status,
      reconnectAttempt: this.reconnectAttempt,
      offlineQueue: this.getOfflineQueue(),
      url: this.url
    };
  }

  onStatusChange(callback: StatusHandler): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  onStateChange(callback: StateHandler): () => void {
    this.stateListeners.add(callback);
    callback(this.getStateSnapshot());
    return () => this.stateListeners.delete(callback);
  }

  on<TPayload = unknown>(type: string, handler: PushHandler<TPayload>): () => void {
    const bucket = this.pushHandlers.get(type) ?? new Set<PushHandler>();
    bucket.add(handler as PushHandler);
    this.pushHandlers.set(type, bucket);
    return () => {
      bucket.delete(handler as PushHandler);
      if (!bucket.size) this.pushHandlers.delete(type);
    };
  }

  async connect(url = this.url): Promise<void> {
    this.setUrl(url);

    if (this.status === "connected") return;
    if (this.connectPromise) return this.connectPromise;

    this.manualDisconnect = false;
    this.clearReconnectTimer();
    this.emitState(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(this.url);
      this.socket = socket;

      const rejectOnce = (reason: unknown) => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        reject(reason);
      };

      socket.onopen = () => {
        settled = true;
        this.connectPromise = null;
        this.reconnectAttempt = 0;
        this.socket = socket;
        this.emitState("connected");
        this.startHeartbeat();
        void this.flushOfflineQueue();
        resolve();
      };

      socket.onmessage = (event) => {
        this.handleIncomingFrame(event.data);
      };

      socket.onerror = () => {
        if (!settled) {
          rejectOnce(new Error(`Unable to connect to ${this.url}`));
        }
      };

      socket.onclose = () => {
        if (this.socket === socket) {
          this.socket = null;
        }
        this.stopHeartbeat();
        if (!settled) {
          rejectOnce(new Error(`Unable to connect to ${this.url}`));
        }
        this.handleSocketClose();
      };
    });

    try {
      await this.connectPromise;
    } catch (error) {
      this.emitState("disconnected");
      throw error;
    }
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.rejectPendingRequests(new Error("Gateway disconnected"));
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      this.socket.close(1000, "manual_disconnect");
    }
    this.socket = null;
    this.connectPromise = null;
    this.emitState("disconnected");
  }

  async reconnect(): Promise<void> {
    this.manualDisconnect = false;
    this.stopHeartbeat();
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
    this.connectPromise = null;
    await this.connect(this.url);
  }

  async send<TPayload = unknown>(
    type: string,
    payload: Record<string, unknown> = {},
    options: SendOptions = {}
  ): Promise<TPayload> {
    const queueIfOffline = options.queueIfOffline ?? true;
    const timeoutMs = options.timeoutMs ?? 30_000;
    const requestId = createId("req");

    if (!this.isSocketReady()) {
      if (!queueIfOffline) {
        throw new Error("Gateway is offline");
      }

      return new Promise<TPayload>((resolve, reject) => {
        this.offlineQueue.push({
          id: requestId,
          type,
          payload,
          timestamp: Date.now(),
          retries: 0,
          timeoutMs,
          resolve,
          reject
        });
        this.emitState(this.status);
      });
    }

    return this.dispatchRequest<TPayload>(requestId, type, payload, timeoutMs);
  }

  async ping(): Promise<GatewayHealth> {
    const startedAt = performance.now();
    await this.send("gateway.ping", {}, { queueIfOffline: false, timeoutMs: 10_000 });
    const status = await this.send<Record<string, unknown>>(
      "gateway.get_status",
      {},
      { queueIfOffline: false, timeoutMs: 10_000 }
    );

    return {
      version: String(status.version ?? "unknown"),
      uptime: Number(status.uptime ?? 0),
      activeConnections: Number(status.activeConnections ?? 0),
      latency: Math.round(performance.now() - startedAt)
    };
  }

  async probe(url = this.url): Promise<GatewayHealth> {
    return new Promise<GatewayHealth>((resolve, reject) => {
      const requestId = createId("probe");
      const startedAt = performance.now();
      const socket = new WebSocket(url);

      const timeout = window.setTimeout(() => {
        socket.close();
        reject(new Error(`Connection probe timed out for ${url}`));
      }, 8_000);

      socket.onopen = () => {
        const request: GatewayRequest = {
          type: "gateway.get_status",
          id: requestId,
          timestamp: Date.now(),
          payload: {}
        };
        socket.send(JSON.stringify(request));
      };

      socket.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error(`Unable to connect to ${url}`));
      };

      socket.onmessage = (event) => {
        window.clearTimeout(timeout);
        try {
          const response = JSON.parse(String(event.data)) as GatewayResponse<Record<string, unknown>>;
          if (response.code !== 0) {
            reject(new GatewayRequestError(response.code, response.message ?? "Probe failed", response.payload));
            return;
          }

          resolve({
            version: String(response.payload?.version ?? "unknown"),
            uptime: Number(response.payload?.uptime ?? 0),
            activeConnections: Number(response.payload?.activeConnections ?? 0),
            latency: Math.round(performance.now() - startedAt)
          });
        } catch (error) {
          reject(error);
        } finally {
          socket.close();
        }
      };
    });
  }

  async getAgents(): Promise<AgentProfile[]> {
    const payload = await this.send<{ agents?: unknown[] }>(
      "gateway.get_agents",
      {},
      { queueIfOffline: false, timeoutMs: 15_000 }
    );

    this.agentsCache = Array.isArray(payload.agents)
      ? payload.agents.map(normalizeAgentProfile)
      : [];

    return [...this.agentsCache];
  }

  private async dispatchRequest<TPayload>(
    requestId: string,
    type: string,
    payload: Record<string, unknown>,
    timeoutMs: number
  ): Promise<TPayload> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway is offline");
    }

    const request: GatewayRequest = {
      type,
      id: requestId,
      timestamp: Date.now(),
      payload
    };

    return new Promise<TPayload>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timed out: ${type}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.socket?.send(JSON.stringify(request));
      } catch (error) {
        window.clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  private handleIncomingFrame(raw: unknown): void {
    try {
      const data = JSON.parse(String(raw)) as GatewayResponse | GatewayPushEvent;
      const requestId =
        (isRecord(data) ? String(data.requestId ?? data.id ?? "") : "") || "";

      if (requestId && this.pendingRequests.has(requestId)) {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) return;

        window.clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        const response = data as GatewayResponse;
        if (response.code === 0) {
          pending.resolve(response.payload);
        } else {
          pending.reject(
            new GatewayRequestError(
              Number(response.code ?? 1),
              response.message ?? "Gateway request failed",
              response.payload
            )
          );
        }
        return;
      }

      const pushEvent = data as GatewayPushEvent;
      if (pushEvent.type === "gateway.disconnected") {
        this.handleSocketClose();
      }

      const handlers = this.pushHandlers.get(pushEvent.type);
      if (handlers) {
        handlers.forEach((handler) => handler(pushEvent));
      }
    } catch (error) {
      console.error("Failed to parse gateway message", error);
    }
  }

  private handleSocketClose(): void {
    this.stopHeartbeat();
    this.rejectPendingRequests(new Error("Gateway connection closed"));

    if (this.manualDisconnect) {
      this.emitState("disconnected");
      return;
    }

    this.emitState("disconnected");
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.reconnectAttempt += 1;
    this.emitState("reconnecting");

    const delay = Math.min(1_000 * 2 ** Math.max(this.reconnectAttempt - 1, 0), 30_000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect(this.url).catch(() => {
        this.emitState("disconnected");
        this.scheduleReconnect();
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      void this.send("gateway.ping", {}, { queueIfOffline: false, timeoutMs: 8_000 }).catch(() => {
        this.handleSocketClose();
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private rejectPendingRequests(reason: Error): void {
    this.pendingRequests.forEach((pending) => {
      window.clearTimeout(pending.timeout);
      pending.reject(reason);
    });
    this.pendingRequests.clear();
  }

  private async flushOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length && this.isSocketReady()) {
      const item = this.offlineQueue.shift();
      if (!item) continue;

      this.emitState(this.status);

      try {
        const payload = await this.dispatchRequest(item.id, item.type, item.payload, item.timeoutMs);
        item.resolve(payload);
      } catch (error) {
        item.retries += 1;
        if (this.isSocketReady() && item.retries < 3) {
          this.offlineQueue.unshift(item);
        } else {
          item.reject(error);
        }
        this.emitState(this.status);
        break;
      }
    }
  }

  private isSocketReady(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private emitState(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
    const snapshot = this.getStateSnapshot();
    this.stateListeners.forEach((listener) => listener(snapshot));
  }
}

export const gatewayService = new GatewayService();
