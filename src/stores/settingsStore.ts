import { create } from "zustand";
import { gatewayService } from "../services/GatewayService";
import { settingsService } from "../services/SettingsService";
import type { GatewayHealth, SettingsState } from "../types";

const initialSettings = settingsService.load();
gatewayService.setUrl(initialSettings.gatewayUrl);

interface SettingsStore {
  settings: SettingsState;
  connectionTest: GatewayHealth | null;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  testConnection: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: initialSettings,
  connectionTest: null,
  update(key, value) {
    set((state) => {
      const settings = { ...state.settings, [key]: value };
      settingsService.save(settings);
      if (key === "gatewayUrl") {
        gatewayService.setUrl(String(value));
      }
      return { settings };
    });
  },
  async testConnection() {
    const result = await settingsService.testConnection(get().settings.gatewayUrl);
    set({ connectionTest: result });
  }
}));
