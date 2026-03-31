import { create } from "zustand";
import { gatewayService } from "../services/GatewayService";
import type { ConnectionStatus, QueuedRequest } from "../types";

interface GatewayStore {
  status: ConnectionStatus;
  reconnectAttempt: number;
  offlineQueue: QueuedRequest[];
  initialized: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  hydrate: () => void;
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  status: "disconnected",
  reconnectAttempt: 0,
  offlineQueue: [],
  initialized: false,
  async connect() {
    await gatewayService.connect();
    set({
      status: gatewayService.getStatus(),
      reconnectAttempt: gatewayService.getReconnectAttempt(),
      offlineQueue: gatewayService.getOfflineQueue()
    });
  },
  disconnect() {
    gatewayService.disconnect();
    set({ status: "disconnected" });
  },
  async reconnect() {
    await gatewayService.reconnect();
    set({
      status: gatewayService.getStatus(),
      reconnectAttempt: gatewayService.getReconnectAttempt(),
      offlineQueue: gatewayService.getOfflineQueue()
    });
  },
  hydrate() {
    if (get().initialized) return;
    gatewayService.onStatusChange((status) => {
      set({
        status,
        reconnectAttempt: gatewayService.getReconnectAttempt(),
        offlineQueue: gatewayService.getOfflineQueue()
      });
    });
    set({ initialized: true });
  }
}));
