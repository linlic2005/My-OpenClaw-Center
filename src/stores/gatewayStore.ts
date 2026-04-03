import { create } from "zustand";
import { getMockTokenUsageStats } from "../data/mock";
import { gatewayService } from "../services/GatewayService";
import { localTokenUsageService } from "../services/LocalTokenUsageService";
import type { AgentProfile, ConnectionStatus, GatewayTokenUsageStat, QueuedRequest } from "../types";

interface GatewayStore {
  status: ConnectionStatus;
  reconnectAttempt: number;
  offlineQueue: QueuedRequest[];
  url: string;
  agents: AgentProfile[];
  agentsLoading: boolean;
  tokenUsage: GatewayTokenUsageStat;
  tokenUsageLoading: boolean;
  initialized: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshAgents: () => Promise<void>;
  refreshTokenUsage: () => Promise<void>;
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  status: gatewayService.getStatus(),
  reconnectAttempt: gatewayService.getReconnectAttempt(),
  offlineQueue: gatewayService.getOfflineQueue(),
  url: gatewayService.getUrl(),
  agents: [],
  agentsLoading: false,
  tokenUsage: getMockTokenUsageStats(),
  tokenUsageLoading: false,
  initialized: false,
  async connect(url) {
    await gatewayService.connect(url);
    set(gatewayService.getStateSnapshot());
    void get().refreshAgents();
    void get().refreshTokenUsage();
  },
  disconnect() {
    gatewayService.disconnect();
    set({
      ...gatewayService.getStateSnapshot(),
      agentsLoading: false,
      tokenUsageLoading: false,
      tokenUsage: getMockTokenUsageStats(get().agents)
    });
  },
  async reconnect() {
    await gatewayService.reconnect();
    set(gatewayService.getStateSnapshot());
    void get().refreshAgents();
    void get().refreshTokenUsage();
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
      set((state) => ({
        agents,
        agentsLoading: false,
        tokenUsage: state.tokenUsage.source === "mock" ? getMockTokenUsageStats(agents) : state.tokenUsage
      }));
    } catch {
      set({ agentsLoading: false });
    }
  },
  async refreshTokenUsage() {
    if (get().status !== "connected") {
      set({ tokenUsage: getMockTokenUsageStats(get().agents), tokenUsageLoading: false });
      return;
    }

    set({ tokenUsageLoading: true });
    try {
      const tokenUsage = await gatewayService.getTokenUsage();
      set({ tokenUsage, tokenUsageLoading: false });
      return;
    } catch {}

    try {
      const tokenUsage = await localTokenUsageService.getTokenUsage(get().agents);
      set({ tokenUsage, tokenUsageLoading: false });
    } catch {
      set({
        tokenUsage: getMockTokenUsageStats(get().agents),
        tokenUsageLoading: false
      });
    }
  }
}));
