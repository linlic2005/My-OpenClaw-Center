import { create } from 'zustand';
import { apiClient } from '@/services/api-client';

export interface Point {
  x: number;
  y: number;
}

export interface AgentEnvironment {
  id: string;
  roomId: string;
  anchors: {
    idle: Point;
    work: Point;
    sleep: Point;
  }
}

export interface RoomConfig {
  id: string;
  name: string;
  background: string;
  type: 'public' | 'private';
  furniture?: Record<string, number>;
}

export interface OfficeState {
  scale: number;
  offset: Point;
  activeRoomId: string;
  selectedAgentId: string | null;
  agentAnchors: Record<string, AgentEnvironment>;
  rooms: Record<string, RoomConfig>;
  isLoaded: boolean;

  // Actions
  fetchOfficeData: () => Promise<void>;
  setScale: (scale: number) => void;
  setOffset: (offset: Point) => void;
  setActiveRoom: (roomId: string) => void;
  setSelectedAgent: (id: string | null) => void;
  addAgentAnchor: (agentId: string, env: AgentEnvironment) => void;
  resetView: () => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  scale: 1.1,
  offset: { x: 0, y: 0 },
  activeRoomId: 'public',
  selectedAgentId: null,
  agentAnchors: {},
  rooms: {},
  isLoaded: false,

  fetchOfficeData: async () => {
    try {
      const [roomsRes, anchorsRes] = await Promise.all([
        apiClient.get('/office/rooms'),
        apiClient.get('/office/agents'),
      ]);

      const roomsArr: RoomConfig[] = roomsRes.data.data;
      const rooms: Record<string, RoomConfig> = {};
      for (const r of roomsArr) {
        rooms[r.id] = r;
      }

      const anchorsArr: Array<{ agentId: string; roomId: string; anchors: AgentEnvironment['anchors'] }> = anchorsRes.data.data;
      const agentAnchors: Record<string, AgentEnvironment> = {};
      for (const a of anchorsArr) {
        agentAnchors[a.agentId] = {
          id: `env-${a.agentId}`,
          roomId: a.roomId,
          anchors: a.anchors,
        };
      }

      set({ rooms, agentAnchors, isLoaded: true });
    } catch (err) {
      console.error('Failed to fetch office data:', err);
    }
  },

  setScale: (scale) => set({ scale }),
  setOffset: (offset) => set({ offset }),
  setActiveRoom: (roomId) => set({ activeRoomId: roomId, selectedAgentId: null }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  addAgentAnchor: (agentId, env) => set((state) => ({
    agentAnchors: { ...state.agentAnchors, [agentId]: env }
  })),
  resetView: () => set({ scale: 1.1, offset: { x: 0, y: 0 }, selectedAgentId: null }),
}));
