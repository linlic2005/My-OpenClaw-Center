import { create } from 'zustand';
import { Agent } from '@/types';
import { MOCK_AGENTS } from '@/services/mock/data';

interface AgentState {
  agents: Agent[];
  isLoading: boolean;
  
  // Actions
  fetchAgents: () => Promise<void>;
  updateAgentStatus: (id: string, status: Agent['status']) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: MOCK_AGENTS,
  isLoading: false,

  fetchAgents: async () => {
    set({ isLoading: true });
    // In a real app, this would be an API call
    await new Promise(r => setTimeout(r, 800));
    set({ agents: MOCK_AGENTS, isLoading: false });
  },

  updateAgentStatus: (id, status) => {
    set((state) => ({
      agents: state.agents.map(a => a.id === id ? { ...a, status } : a)
    }));
  }
}));
