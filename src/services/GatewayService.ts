import { getMockAgents } from "../data/mock";
import type { AppLanguage } from "../lib/i18n";
import { createId, sleep } from "../lib/utils";
import type {
  AgentProfile,
  ConnectionStatus,
  GatewayHealth,
  QueuedRequest
} from "../types";

type StatusHandler = (status: ConnectionStatus) => void;

class GatewayService {
  private status: ConnectionStatus = "disconnected";
  private listeners = new Set<StatusHandler>();
  private heartbeatTimer: number | null = null;
  private reconnectAttempt = 0;
  private offlineQueue: QueuedRequest[] = [];
  private language: AppLanguage = "zh-CN";

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  getOfflineQueue(): QueuedRequest[] {
    return [...this.offlineQueue];
  }

  onStatusChange(callback: StatusHandler): () => void {
    this.listeners.add(callback);
    callback(this.status);
    return () => this.listeners.delete(callback);
  }

  private emitStatus(status: ConnectionStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  async connect(): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") return;
    this.emitStatus("connecting");
    await sleep(900);
    this.reconnectAttempt = 0;
    this.emitStatus("connected");
    this.startHeartbeat();
    await this.flushOfflineQueue();
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.emitStatus("disconnected");
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      void this.ping();
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async ping(): Promise<GatewayHealth> {
    await sleep(120);
    return {
      version: "1.5.0",
      uptime: 86400000,
      activeConnections: 5,
      latency: 23
    };
  }

  async reconnect(): Promise<void> {
    this.stopHeartbeat();
    this.reconnectAttempt += 1;
    this.emitStatus("reconnecting");
    const delay = Math.min(2 ** Math.max(this.reconnectAttempt - 1, 0), 30) * 300;
    await sleep(delay);
    this.emitStatus("connected");
    this.startHeartbeat();
    await this.flushOfflineQueue();
  }

  async send(type: string, payload: Record<string, unknown>): Promise<{ requestId: string }> {
    const requestId = createId("req");
    if (this.status !== "connected") {
      this.offlineQueue.push({ id: requestId, type, payload, timestamp: Date.now() });
      return { requestId };
    }
    await sleep(280);
    return { requestId };
  }

  private async flushOfflineQueue(): Promise<void> {
    if (!this.offlineQueue.length) return;
    const pending = [...this.offlineQueue];
    this.offlineQueue = [];
    for (const item of pending) {
      await this.send(item.type, item.payload);
    }
  }

  async getAgents(): Promise<AgentProfile[]> {
    await sleep(180);
    return getMockAgents(this.language);
  }
}

export const gatewayService = new GatewayService();
