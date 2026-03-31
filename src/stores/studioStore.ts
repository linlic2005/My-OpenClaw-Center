import { create } from "zustand";
import { studioService } from "../services/StudioService";
import type { AppLanguage } from "../lib/i18n";
import type { StudioAgentStatus } from "../types";

interface StudioStore {
  agents: StudioAgentStatus[];
  load: (language?: AppLanguage) => Promise<void>;
}

export const useStudioStore = create<StudioStore>((set) => ({
  agents: [],
  async load(language) {
    if (language) studioService.setLanguage(language);
    const agents = await studioService.listAgents();
    set({ agents });
  }
}));
