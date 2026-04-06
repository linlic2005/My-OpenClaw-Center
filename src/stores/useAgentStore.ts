import { create } from 'zustand';
import { Agent } from '@/types';
import { apiClient } from '@/services/api-client';

interface AgentState {
  agents: Agent[];
  isLoading: boolean;

  // Actions
  fetchAgents: () => Promise<void>;
  upsertAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: Agent['status']) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  isLoading: false,

  fetchAgents: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/agents');
      set({ agents: res.data.data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      set({ isLoading: false });
    }
  },

  upsertAgent: (agent) => {
    set((state) => {
      const exists = state.agents.some((item) => item.id === agent.id);
      return {
        agents: exists
          ? state.agents.map((item) => item.id === agent.id ? { ...item, ...agent } : item)
          : [agent, ...state.agents],
      };
    });
  },

  removeAgent: (id) => {
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
    }));
  },

  updateAgentStatus: (id, status) => {
    set((state) => ({
      agents: state.agents.map(a => a.id === id ? { ...a, status } : a)
    }));
  }
}));
