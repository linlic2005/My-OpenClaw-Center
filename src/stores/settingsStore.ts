import { create } from "zustand";
import { settingsService } from "../services/SettingsService";
import type { GatewayHealth, SettingsState } from "../types";

interface SettingsStore {
  settings: SettingsState;
  connectionTest: GatewayHealth | null;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  testConnection: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: settingsService.load(),
  connectionTest: null,
  update(key, value) {
    set((state) => {
      const settings = { ...state.settings, [key]: value };
      settingsService.save(settings);
      return { settings };
    });
  },
  async testConnection() {
    const result = await settingsService.testConnection();
    set({ connectionTest: result });
  }
}));
