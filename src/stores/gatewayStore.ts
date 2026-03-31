import { create } from "zustand";
import { gatewayService } from "../services/GatewayService";
import type { AgentProfile, ConnectionStatus, QueuedRequest } from "../types";

interface GatewayStore {
  status: ConnectionStatus;
  reconnectAttempt: number;
  offlineQueue: QueuedRequest[];
  url: string;
  agents: AgentProfile[];
  agentsLoading: boolean;
  initialized: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshAgents: () => Promise<void>;
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  status: gatewayService.getStatus(),
  reconnectAttempt: gatewayService.getReconnectAttempt(),
  offlineQueue: gatewayService.getOfflineQueue(),
  url: gatewayService.getUrl(),
  agents: [],
  agentsLoading: false,
  initialized: false,
  async connect(url) {
    await gatewayService.connect(url);
    set(gatewayService.getStateSnapshot());
    void get().refreshAgents();
  },
  disconnect() {
    gatewayService.disconnect();
    set({ ...gatewayService.getStateSnapshot(), agentsLoading: false });
  },
  async reconnect() {
    await gatewayService.reconnect();
    set(gatewayService.getStateSnapshot());
    void get().refreshAgents();
  },
  async hydrate() {
    if (get().initialized) return;
    await gatewayService.hydratePersistence();
    gatewayService.onStateChange((snapshot) => {
      set(snapshot);
    });
    set({ initialized: true });
  },
  async refreshAgents() {
    if (get().status !== "connected") return;
    set({ agentsLoading: true });
    try {
      const agents = await gatewayService.getAgents();
      set({ agents, agentsLoading: false });
    } catch {
      set({ agentsLoading: false });
    }
  }
}));
