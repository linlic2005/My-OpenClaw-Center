import { create } from 'zustand';

export interface Point {
  x: number;
  y: number;
}

export interface OfficeState {
  scale: number;
  offset: Point;
  selectedAgentId: string | null;
  agentPositions: Record<string, Point>;
  
  // Actions
  setScale: (scale: number) => void;
  setOffset: (offset: Point) => void;
  setSelectedAgent: (id: string | null) => void;
  updateAgentPosition: (id: string, pos: Point) => void;
  resetView: () => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  scale: 1,
  offset: { x: 0, y: 0 },
  selectedAgentId: null,
  agentPositions: {
    'agent-1': { x: 200, y: 150 },
    'agent-2': { x: 450, y: 300 },
    'agent-3': { x: 100, y: 400 },
  },

  setScale: (scale) => set({ scale }),
  setOffset: (offset) => set({ offset }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  updateAgentPosition: (id, pos) => set((state) => ({
    agentPositions: { ...state.agentPositions, [id]: pos }
  })),
  resetView: () => set({ scale: 1, offset: { x: 0, y: 0 }, selectedAgentId: null }),
}));
