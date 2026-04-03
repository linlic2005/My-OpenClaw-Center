import { createId } from "../lib/utils";
import { getDefaultDeploymentMode, getPresetEndpoints, runtimeAppMeta } from "../config/runtime";
import { persistenceService } from "./PersistenceService";
import {
  buildGatewayConnectDevice,
  clearDeviceAuthToken,
  loadDeviceAuthToken,
  loadOrCreateDeviceIdentity,
  storeDeviceAuthToken,
  type StoredGatewayDeviceIdentity
} from "./GatewayDeviceAuth";
import type {
  AgentProfile,
  AgentTokenUsageStat,
  AgentRuntimeStatus,
  ConnectionStatus,
  GatewayHealth,
  GatewayPushEvent,
  GatewayRequest,
  GatewayResponse,
  GatewayTokenUsageStat,
  QueuedRequest
} from "../types";

type StatusHandler = (status: ConnectionStatus) => void;
type StateHandler = (state: GatewayStateSnapshot) => void;
type PushHandler<TPayload = unknown> = (event: GatewayPushEvent<TPayload>) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
}

interface QueueEntry extends QueuedRequest {
  timeoutMs: number;
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
}

interface SendOptions {
  queueIfOffline?: boolean;
  timeoutMs?: number;
}

interface GatewayEventFrame<TPayload = unknown> {
  type: "event";
  event: string;
  payload: TPayload | undefined;
  seq?: number;
  ts?: number;
}

interface GatewayErrorEnvelope {
  code?: string;
  message?: string;
  details?: unknown;
}

interface GatewayHelloPayload {
  protocol?: number;
  server?: {
    version?: string;
    connId?: string;
  };
  features?: {
    methods?: string[];
    events?: string[];
    caps?: string[];
  };
  auth?: {
    role?: string;
    scopes?: string[];
    deviceToken?: string;
    issuedAtMs?: number;
  };
  snapshot?: {
    activeConnections?: number;
    uptimeMs?: number;
  };
  policy?: {
    tickIntervalMs?: number;
  };
}

interface ConnectChallengePayload {
  nonce?: string;
}

interface ConnectPlan {
  url: string;
  params: Record<string, unknown>;
  deviceIdentity: StoredGatewayDeviceIdentity | null;
  storedDeviceToken?: string;
  authToken?: string;
  role: string;
  scopes: string[];
}

export interface GatewayStateSnapshot {
  status: ConnectionStatus;
  reconnectAttempt: number;
  offlineQueue: QueuedRequest[];
  url: string;
}

export class GatewayRequestError extends Error {
  code: string | number;
  payload?: unknown;
  details?: unknown;

  constructor(code: string | number, message: string, payload?: unknown, details?: unknown) {
    super(message);
    this.name = "GatewayRequestError";
    this.code = code;
    this.payload = payload;
    this.details = details;
  }
}

const DEFAULT_URL = getPresetEndpoints(getDefaultDeploymentMode()).gatewayUrl;
const MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const CONNECT_QUEUE_DELAY_MS = 750;
const CONNECT_TIMEOUT_MS = 15_000;
const OFFLINE_QUEUE_KEY = "gateway.offlineQueue";
const AUTH_TOKEN_KEY = "gateway.authToken";

const GATEWAY_PROTOCOL_VERSION = 3;
const GATEWAY_ROLE = "operator";
const GATEWAY_CLIENT_ID = "openclaw-center";
const GATEWAY_CLIENT_MODE = "webchat";
const GATEWAY_CAPS = ["tool-events"];
const GATEWAY_SCOPES = ["operator.read", "operator.write"];

const RETRYABLE_DEVICE_TOKEN_ERRORS = new Set(["AUTH_DEVICE_TOKEN_MISMATCH", "device-token-invalid"]);
const RETRYABLE_SHARED_TOKEN_ERRORS = new Set(["AUTH_TOKEN_MISMATCH"]);

const iconMap: Record<string, string> = {
  code: "C",
  coding: "C",
  search: "S",
  research: "S",
  write: "W",
  writing: "W",
  design: "D",
  studio: "T",
  robot: "R"
};

const statusMap: Record<string, AgentRuntimeStatus> = {
  idle: "idle",
  ready: "idle",
  waiting: "idle",
  writing: "writing",
  write: "writing",
  drafting: "writing",
  researching: "researching",
  research: "researching",
  searching: "researching",
  executing: "executing",
  execute: "executing",
  running: "executing",
  syncing: "syncing",
  sync: "syncing",
  offline: "offline",
  disconnected: "offline",
  error: "error",
  failed: "error"
};

const TOKEN_USAGE_METHODS = [
  "metrics.tokens",
  "usage.tokens",
  "stats.tokens",
  "usage.get_token_stats",
  "agents.token_usage",
  "dashboard.token_usage"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pickFirstNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (key in record) {
      return toNumber(record[key]);
    }
  }
  return 0;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractAgentUsageList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const buckets = ["agents", "rankings", "leaderboard", "usageByAgent", "topAgents", "items"];
  for (const key of buckets) {
    if (Array.isArray(payload[key])) {
      return payload[key] as unknown[];
    }
  }

  return [];
}

function normalizeAgentTokenUsage(raw: unknown, agentsCache: AgentProfile[]): AgentTokenUsageStat {
  const record = isRecord(raw) ? raw : {};
  const agentId = pickFirstString(record, ["agentId", "id", "agent_id"]) || createId("agent_usage");
  const cached = agentsCache.find((agent) => agent.id === agentId);
  const name = pickFirstString(record, ["name", "agentName", "agent_name", "label"]) || cached?.name || agentId;
  const inputTokens = pickFirstNumber(record, ["inputTokens", "input", "promptTokens", "prompt_tokens"]);
  const outputTokens = pickFirstNumber(record, ["outputTokens", "output", "completionTokens", "completion_tokens"]);
  const totalTokens =
    pickFirstNumber(record, ["totalTokens", "total", "tokens"]) || inputTokens + outputTokens;

  return {
    agentId,
    name,
    inputTokens,
    outputTokens,
    totalTokens,
    requests: pickFirstNumber(record, ["requests", "requestCount", "request_count", "calls"]),
    lastUpdated: pickFirstNumber(record, ["updatedAt", "lastUpdated", "ts"]) || undefined
  };
}

function normalizeTokenUsage(payload: unknown, agentsCache: AgentProfile[]): GatewayTokenUsageStat {
  const record = isRecord(payload) ? payload : {};
  const totals = isRecord(record.totals) ? record.totals : record;
  const agents = extractAgentUsageList(payload)
    .map((item) => normalizeAgentTokenUsage(item, agentsCache))
    .sort((left, right) => right.totalTokens - left.totalTokens);

  const totalInputTokens =
    pickFirstNumber(totals, ["totalInputTokens", "inputTokens", "promptTokens", "prompt_tokens"]) ||
    agents.reduce((sum, agent) => sum + agent.inputTokens, 0);
  const totalOutputTokens =
    pickFirstNumber(totals, ["totalOutputTokens", "outputTokens", "completionTokens", "completion_tokens"]) ||
    agents.reduce((sum, agent) => sum + agent.outputTokens, 0);
  const totalTokens =
    pickFirstNumber(totals, ["totalTokens", "tokens"]) || totalInputTokens + totalOutputTokens;

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalRequests:
      pickFirstNumber(totals, ["totalRequests", "requests", "requestCount", "request_count"]) ||
      agents.reduce((sum, agent) => sum + agent.requests, 0),
    agents,
    source: "gateway",
    updatedAt: pickFirstNumber(totals, ["updatedAt", "lastUpdated", "ts"]) || Date.now()
  };
}

function normalizeAgentProfile(raw: unknown): AgentProfile {
  const record = isRecord(raw) ? raw : {};
  const iconKey = String(record.icon ?? record.kind ?? "robot").toLowerCase();
  const installed = record.installed === undefined ? true : Boolean(record.installed);
  const enabled = record.enabled === undefined ? true : Boolean(record.enabled);
  const rawStatus = String(record.status ?? record.state ?? record.phase ?? (enabled ? "idle" : "offline")).toLowerCase();
  const scopes = Array.isArray(record.scopes) ? record.scopes.map(String) : [];
  const capabilities = Array.isArray(record.capabilities) ? record.capabilities.map(String) : [];
  const tags = Array.isArray(record.tags) ? record.tags.map(String) : [];

  return {
    id: String(record.id ?? createId("agent")),
    name: String(record.name ?? record.label ?? "Agent"),
    description: String(record.description ?? record.summary ?? ""),
    icon: iconMap[iconKey] ?? String(record.icon ?? record.kind ?? "R").slice(0, 1).toUpperCase(),
    enabled,
    installed,
    status: statusMap[rawStatus] ?? "idle",
    kind: typeof record.kind === "string" ? record.kind : undefined,
    role: typeof record.role === "string" ? record.role : undefined,
    version: typeof record.version === "string" ? record.version : undefined,
    channel: typeof record.channel === "string" ? record.channel : undefined,
    scopes,
    capabilities,
    tags,
    updatedAt:
      typeof record.updatedAt === "number"
        ? record.updatedAt
        : typeof record.lastUpdated === "number"
          ? record.lastUpdated
          : typeof record.lastSeen === "number"
            ? record.lastSeen
            : undefined
  };
}

function getLocale(): string {
  return navigator.language || "en-US";
}

function getUserAgent(): string {
  return navigator.userAgent || "OpenClaw Center";
}

function normalizeErrorCode(code: unknown): string | number {
  if (typeof code === "number") return code;
  if (typeof code === "string" && code.trim()) return code.trim();
  return "gateway_error";
}

function toGatewayResponseError(response: GatewayResponse): GatewayRequestError {
  const payload = response.payload;
  const code = normalizeErrorCode(response.error?.code);
  const message = response.error?.message?.trim() || "Gateway request failed";

  return new GatewayRequestError(code, message, payload, response.error?.details);
}

function parseGatewayFrame(raw: unknown): GatewayResponse | GatewayEventFrame | null {
  const parsed = JSON.parse(String(raw)) as GatewayResponse | GatewayEventFrame;
  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return null;
  }

  if (parsed.type === "res") {
    return parsed as GatewayResponse;
  }

  if (parsed.type === "event" && typeof (parsed as GatewayEventFrame).event === "string") {
    return parsed as GatewayEventFrame;
  }

  return null;
}

export class GatewayService {
  private socket: WebSocket | null = null;
  private url = DEFAULT_URL;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempt = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
  private manualDisconnect = false;
  private connectPromise: Promise<void> | null = null;
  private statusListeners = new Set<StatusHandler>();
  private stateListeners = new Set<StateHandler>();
  private pushHandlers = new Map<string, Set<PushHandler>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private offlineQueue: QueueEntry[] = [];
  private agentsCache: AgentProfile[] = [];
  private persistenceHydrated = false;
  private authToken: string | null = null;
  private lastHello: GatewayHelloPayload | null = null;

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
    await this.hydratePersistence();

    if (this.status === "connected") return;
    if (this.connectPromise) return this.connectPromise;

    this.manualDisconnect = false;
    this.clearReconnectTimer();
    this.emitState(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      let connectNonce: string | null = null;
      let connectQueuedTimer: number | null = null;
      let connectInFlight = false;
      let retryWithStoredDeviceToken = false;
      let suppressReconnectOnClose = false;
      const socket = new WebSocket(this.url);
      this.socket = socket;

      const clearConnectTimer = () => {
        if (connectQueuedTimer !== null) {
          window.clearTimeout(connectQueuedTimer);
          connectQueuedTimer = null;
        }
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        resolve();
      };

      const rejectOnce = (reason: unknown) => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        reject(reason);
      };

      const queueConnect = () => {
        clearConnectTimer();
        connectQueuedTimer = window.setTimeout(() => {
          void sendConnect();
        }, CONNECT_QUEUE_DELAY_MS);
      };

      const sendConnect = async () => {
        if (connectInFlight || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        connectInFlight = true;
        clearConnectTimer();
        let plan: ConnectPlan | null = null;

        try {
          plan = await this.buildConnectPlan(this.url, connectNonce, retryWithStoredDeviceToken);
          const hello = await this.dispatchRequest<GatewayHelloPayload>(
            "connect",
            plan.params,
            CONNECT_TIMEOUT_MS,
            socket
          );

          this.lastHello = hello;
          this.heartbeatIntervalMs = this.resolveHeartbeatInterval(hello);
          this.reconnectAttempt = 0;
          this.socket = socket;
          this.emitState("connected");

          if (plan.deviceIdentity && hello.auth?.deviceToken) {
            await storeDeviceAuthToken({
              url: this.url,
              deviceId: plan.deviceIdentity.deviceId,
              role: hello.auth.role ?? plan.role,
              token: hello.auth.deviceToken,
              scopes: hello.auth.scopes ?? plan.scopes
            });
          }

          this.startHeartbeat();
          void this.flushOfflineQueue();
          resolveOnce();
        } catch (error) {
          connectInFlight = false;
          const handled = await this.handleConnectFailure(error, plan, retryWithStoredDeviceToken);

          if (handled === "retry-without-device-token") {
            retryWithStoredDeviceToken = false;
            queueConnect();
            return;
          }

          if (handled === "retry-with-device-token") {
            retryWithStoredDeviceToken = true;
            queueConnect();
            return;
          }

          suppressReconnectOnClose = true;
          socket.close(4008, "connect_failed");
          rejectOnce(error);
        }
      };

      socket.onopen = () => {
        queueConnect();
      };

      socket.onmessage = (event) => {
        try {
          const frame = parseGatewayFrame(event.data);
          if (!frame) {
            return;
          }

          if (frame.type === "event" && frame.event === "connect.challenge") {
            const payload = isRecord(frame.payload) ? (frame.payload as ConnectChallengePayload) : {};
            connectNonce = typeof payload.nonce === "string" ? payload.nonce : null;
            if (!connectInFlight) {
              void sendConnect();
            }
            return;
          }

          this.routeFrame(frame);
        } catch (error) {
          console.error("Failed to parse gateway message", error);
          void persistenceService.logError("gateway", error, { phase: "connect.onmessage" });
        }
      };

      socket.onerror = () => {
        if (!settled && socket.readyState !== WebSocket.OPEN) {
          rejectOnce(new Error(`Unable to connect to ${this.url}`));
        }
      };

      socket.onclose = () => {
        if (this.socket === socket) {
          this.socket = null;
        }

        clearConnectTimer();
        this.stopHeartbeat();

        if (!settled) {
          rejectOnce(new Error(`Unable to connect to ${this.url}`));
        }

        if (suppressReconnectOnClose) {
          this.emitState("disconnected");
          return;
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

  async hydratePersistence(): Promise<void> {
    if (this.persistenceHydrated) return;

    try {
      const [storedQueue, storedToken] = await Promise.all([
        persistenceService.getJson<QueuedRequest[]>(OFFLINE_QUEUE_KEY, []),
        persistenceService.getJson<string | null>(AUTH_TOKEN_KEY, null)
      ]);

      this.authToken = storedToken?.trim() || null;
      this.offlineQueue = storedQueue.map((item) => ({
        ...item,
        retries: Number(item.retries ?? 0),
        resolve: () => undefined,
        reject: () => undefined,
        timeoutMs: 30_000
      }));
      this.persistenceHydrated = true;
      this.emitState(this.status);
    } catch (error) {
      void persistenceService.logError("gateway", error, { phase: "hydratePersistence" });
      this.persistenceHydrated = true;
    }
  }

  async setAuthToken(token: string | null): Promise<void> {
    const normalized = token?.trim() || null;
    this.authToken = normalized;
    await persistenceService.setJson(AUTH_TOKEN_KEY, normalized);
  }

  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.persistOfflineQueue();
    this.emitState(this.status);
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
        void this.persistOfflineQueue();
        this.emitState(this.status);
      });
    }

    return this.dispatchRequest<TPayload>(type, payload, timeoutMs);
  }

  async ping(): Promise<GatewayHealth> {
    const startedAt = performance.now();

    try {
      const payload = await this.send<Record<string, unknown>>("health", {}, { queueIfOffline: false, timeoutMs: 10_000 });
      return {
        version: String(payload.version ?? this.lastHello?.server?.version ?? "unknown"),
        uptime: Number(payload.uptimeMs ?? this.lastHello?.snapshot?.uptimeMs ?? 0),
        activeConnections: Number(
          payload.activeConnections ?? this.lastHello?.snapshot?.activeConnections ?? 0
        ),
        latency: Math.round(performance.now() - startedAt)
      };
    } catch {
      return this.helloToHealth(this.lastHello, Math.round(performance.now() - startedAt));
    }
  }

  async probe(url = this.url): Promise<GatewayHealth> {
    await this.hydratePersistence();

    return new Promise<GatewayHealth>((resolve, reject) => {
      const socket = new WebSocket(url);
      let connectNonce: string | null = null;
      let connectTimer: number | null = null;
      let connectInFlight = false;
      let retryWithStoredDeviceToken = false;
      const startedAt = performance.now();

      const clearTimer = () => {
        if (connectTimer !== null) {
          window.clearTimeout(connectTimer);
          connectTimer = null;
        }
      };

      const fail = (error: unknown) => {
        clearTimer();
        socket.close();
        reject(error);
      };

      const queueConnect = () => {
        clearTimer();
        connectTimer = window.setTimeout(() => {
          void sendConnect();
        }, CONNECT_QUEUE_DELAY_MS);
      };

      const sendConnect = async () => {
        if (connectInFlight || socket.readyState !== WebSocket.OPEN) return;
        connectInFlight = true;

        let plan: ConnectPlan | null = null;
        try {
          plan = await this.buildConnectPlan(url, connectNonce, retryWithStoredDeviceToken);
          const hello = await this.dispatchRequest<GatewayHelloPayload>(
            "connect",
            plan.params,
            CONNECT_TIMEOUT_MS,
            socket
          );

          if (plan.deviceIdentity && hello.auth?.deviceToken) {
            await storeDeviceAuthToken({
              url,
              deviceId: plan.deviceIdentity.deviceId,
              role: hello.auth.role ?? plan.role,
              token: hello.auth.deviceToken,
              scopes: hello.auth.scopes ?? plan.scopes
            });
          }

          clearTimer();
          socket.close();
          resolve(this.helloToHealth(hello, Math.round(performance.now() - startedAt)));
        } catch (error) {
          connectInFlight = false;
          const handled = await this.handleConnectFailure(error, plan, retryWithStoredDeviceToken);

          if (handled === "retry-without-device-token") {
            retryWithStoredDeviceToken = false;
            queueConnect();
            return;
          }

          if (handled === "retry-with-device-token") {
            retryWithStoredDeviceToken = true;
            queueConnect();
            return;
          }

          fail(error);
        }
      };

      socket.onopen = () => {
        queueConnect();
      };

      socket.onmessage = (event) => {
        try {
          const frame = parseGatewayFrame(event.data);
          if (!frame) return;

          if (frame.type === "event" && frame.event === "connect.challenge") {
            const payload = isRecord(frame.payload) ? (frame.payload as ConnectChallengePayload) : {};
            connectNonce = typeof payload.nonce === "string" ? payload.nonce : null;
            if (!connectInFlight) {
              void sendConnect();
            }
            return;
          }

          this.routeFrame(frame);
        } catch (error) {
          fail(error);
        }
      };

      socket.onerror = () => {
        fail(new Error(`Unable to connect to ${url}`));
      };

      socket.onclose = () => {
        clearTimer();
      };
    });
  }

  async getAgents(): Promise<AgentProfile[]> {
    const payload = await this.send<{ agents?: unknown[] } | unknown[]>(
      "agents.list",
      {},
      { queueIfOffline: false, timeoutMs: 15_000 }
    );

    const rawAgents = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { agents?: unknown[] })?.agents)
        ? (payload as { agents?: unknown[] }).agents ?? []
        : [];

    this.agentsCache = rawAgents.map(normalizeAgentProfile);
    return [...this.agentsCache];
  }

  async getTokenUsage(): Promise<GatewayTokenUsageStat> {
    let lastError: unknown;

    for (const method of TOKEN_USAGE_METHODS) {
      try {
        const payload = await this.send<unknown>(method, {}, { queueIfOffline: false, timeoutMs: 15_000 });
        return normalizeTokenUsage(payload, this.agentsCache);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Gateway token usage endpoint is unavailable");
  }

  private async dispatchRequest<TPayload>(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number,
    socket = this.socket
  ): Promise<TPayload> {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway is offline");
    }

    const requestId = createId("req");
    const request: GatewayRequest = {
      type: "req",
      id: requestId,
      method,
      params
    };

    return new Promise<TPayload>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timed out: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        socket.send(JSON.stringify(request));
      } catch (error) {
        window.clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  private routeFrame(frame: GatewayResponse | GatewayEventFrame): void {
    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id);
      if (!pending) return;

      window.clearTimeout(pending.timeout);
      this.pendingRequests.delete(frame.id);

      if (frame.ok) {
        pending.resolve(frame.payload);
        return;
      }

      const error = toGatewayResponseError(frame);
      pending.reject(error);

      if (String(error.code) === "AUTH_TOKEN_MISMATCH") {
        void this.setAuthToken(this.authToken);
      }
      return;
    }

    const handlers = this.pushHandlers.get(frame.event);
    if (handlers) {
      handlers.forEach((handler) => handler(frame as GatewayPushEvent));
    }
  }

  private async buildConnectPlan(
    url: string,
    connectNonce: string | null,
    retryWithStoredDeviceToken: boolean
  ): Promise<ConnectPlan> {
    const deviceIdentity = await loadOrCreateDeviceIdentity();
    const storedDeviceToken = deviceIdentity
      ? await loadDeviceAuthToken({
          url,
          deviceId: deviceIdentity.deviceId,
          role: GATEWAY_ROLE
        })
      : undefined;
    const explicitAuthToken = this.authToken?.trim() || undefined;
    const fallbackToken = storedDeviceToken?.token;

    let authToken = explicitAuthToken;
    let deviceToken: string | undefined;

    if (retryWithStoredDeviceToken && fallbackToken) {
      authToken = fallbackToken;
      deviceToken = undefined;
    } else if (!authToken && fallbackToken) {
      authToken = fallbackToken;
      deviceToken = undefined;
    } else if (authToken && fallbackToken) {
      deviceToken = fallbackToken;
    }

    const device = await buildGatewayConnectDevice({
      deviceIdentity,
      clientId: GATEWAY_CLIENT_ID,
      clientMode: GATEWAY_CLIENT_MODE,
      role: GATEWAY_ROLE,
      scopes: GATEWAY_SCOPES,
      authToken,
      connectNonce
    });

    const params: Record<string, unknown> = {
      minProtocol: GATEWAY_PROTOCOL_VERSION,
      maxProtocol: GATEWAY_PROTOCOL_VERSION,
      role: GATEWAY_ROLE,
      scopes: GATEWAY_SCOPES,
      client: {
        id: GATEWAY_CLIENT_ID,
        mode: GATEWAY_CLIENT_MODE,
        version: runtimeAppMeta.version,
        userAgent: getUserAgent(),
        locale: getLocale()
      },
      caps: GATEWAY_CAPS
    };

    if (device) {
      params.device = {
        id: device.id,
        publicKey: device.publicKey,
        signature: device.signature,
        signedAtMs: device.signedAt,
        nonce: device.nonce
      };
    }

    if (authToken || deviceToken) {
      params.auth = {
        ...(authToken ? { token: authToken } : {}),
        ...(deviceToken ? { deviceToken } : {})
      };
    }

    return {
      url,
      params,
      deviceIdentity,
      storedDeviceToken: fallbackToken,
      authToken,
      role: GATEWAY_ROLE,
      scopes: GATEWAY_SCOPES
    };
  }

  private async handleConnectFailure(
    error: unknown,
    plan: ConnectPlan | null,
    retryWithStoredDeviceToken: boolean
  ): Promise<"retry-without-device-token" | "retry-with-device-token" | "fail"> {
    if (!(error instanceof GatewayRequestError) || !plan?.deviceIdentity) {
      return "fail";
    }

    const code = String(error.code);

    if (plan.storedDeviceToken && RETRYABLE_DEVICE_TOKEN_ERRORS.has(code)) {
      await clearDeviceAuthToken({
        url: plan.url,
        deviceId: plan.deviceIdentity.deviceId,
        role: plan.role
      });
      return "retry-without-device-token";
    }

    if (
      plan.storedDeviceToken &&
      this.authToken &&
      !retryWithStoredDeviceToken &&
      RETRYABLE_SHARED_TOKEN_ERRORS.has(code)
    ) {
      return "retry-with-device-token";
    }

    return "fail";
  }

  private helloToHealth(hello: GatewayHelloPayload | null, latency: number): GatewayHealth {
    return {
      version: String(hello?.server?.version ?? "unknown"),
      uptime: Number(hello?.snapshot?.uptimeMs ?? 0),
      activeConnections: Number(hello?.snapshot?.activeConnections ?? 0),
      latency
    };
  }

  private resolveHeartbeatInterval(hello: GatewayHelloPayload | null): number {
    const configured = Number(hello?.policy?.tickIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS);
    if (!Number.isFinite(configured) || configured <= 1_000) {
      return DEFAULT_HEARTBEAT_INTERVAL_MS;
    }
    return Math.min(Math.max(configured, 5_000), 60_000);
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
      void this.send("health", {}, { queueIfOffline: false, timeoutMs: 8_000 }).catch(() => {
        this.handleSocketClose();
      });
    }, this.heartbeatIntervalMs);
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

      void this.persistOfflineQueue();
      this.emitState(this.status);

      try {
        const payload = await this.dispatchRequest(item.type, item.payload, item.timeoutMs);
        item.resolve(payload);
      } catch (error) {
        item.retries += 1;
        if (this.isSocketReady() && item.retries < 3) {
          this.offlineQueue.unshift(item);
        } else {
          item.reject(error);
        }
        void persistenceService.logError("gateway", error, {
          phase: "flushOfflineQueue",
          requestType: item.type
        });
        void this.persistOfflineQueue();
        this.emitState(this.status);
        break;
      }
    }
  }

  private async persistOfflineQueue(): Promise<void> {
    try {
      await persistenceService.setJson(
        OFFLINE_QUEUE_KEY,
        this.offlineQueue.map(({ id, type, payload, timestamp, retries }) => ({
          id,
          type,
          payload,
          timestamp,
          retries
        }))
      );
    } catch (error) {
      void persistenceService.logError("gateway", error, { phase: "persistOfflineQueue" }, "warn");
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
