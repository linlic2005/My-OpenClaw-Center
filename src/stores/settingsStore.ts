import { create } from "zustand";
import { gatewayService } from "../services/GatewayService";
import { persistenceService } from "../services/PersistenceService";
import { settingsService } from "../services/SettingsService";
import { createId } from "../lib/utils";
import type { ChannelConfig, GatewayHealth, SettingsState } from "../types";

const initialSettings = settingsService.load();
gatewayService.setUrl(initialSettings.gatewayUrl);

interface SettingsStore {
  settings: SettingsState;
  connectionTest: GatewayHealth | null;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  addChannel: () => void;
  updateChannel: (channelId: string, patch: Partial<ChannelConfig>) => void;
  removeChannel: (channelId: string) => void;
  toggleSkillInstalled: (agentId: string) => void;
  toggleSkillEnabled: (agentId: string) => void;
  resetSettings: () => void;
  exportDiagnostics: () => Promise<void>;
  clearErrorLogs: () => Promise<void>;
  clearOfflineQueue: () => Promise<void>;
  testConnection: () => Promise<void>;
}

function persistSettings(settings: SettingsState): SettingsState {
  settingsService.save(settings);
  return settings;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: initialSettings,
  connectionTest: null,
  update(key, value) {
    set((state) => {
      const settings = persistSettings({ ...state.settings, [key]: value });
      if (key === "gatewayUrl") {
        gatewayService.setUrl(String(value));
      }
      return { settings };
    });
  },
  addChannel() {
    set((state) => ({
      settings: persistSettings({
        ...state.settings,
        channels: [
          ...state.settings.channels,
          {
            id: createId("channel"),
            name: state.settings.language === "zh-CN" ? "新渠道" : "New Channel",
            tokenPreview: "tok_****"
          }
        ]
      })
    }));
  },
  updateChannel(channelId, patch) {
    set((state) => ({
      settings: persistSettings({
        ...state.settings,
        channels: state.settings.channels.map((channel) =>
          channel.id === channelId ? { ...channel, ...patch } : channel
        )
      })
    }));
  },
  removeChannel(channelId) {
    set((state) => ({
      settings: persistSettings({
        ...state.settings,
        channels: state.settings.channels.filter((channel) => channel.id !== channelId)
      })
    }));
  },
  toggleSkillInstalled(agentId) {
    set((state) => {
      const existing = state.settings.skillPreferences.find((item) => item.agentId === agentId);
      const nextInstalled = !(existing?.installed ?? false);
      const settings = persistSettings({
        ...state.settings,
        skillPreferences: [
          ...state.settings.skillPreferences.filter((item) => item.agentId !== agentId),
          {
            agentId,
            installed: nextInstalled,
            enabled: nextInstalled ? (existing?.enabled ?? false) : false
          }
        ]
      });
      return { settings };
    });
  },
  toggleSkillEnabled(agentId) {
    set((state) => {
      const existing = state.settings.skillPreferences.find((item) => item.agentId === agentId);
      const installed = existing?.installed ?? true;
      const settings = persistSettings({
        ...state.settings,
        skillPreferences: [
          ...state.settings.skillPreferences.filter((item) => item.agentId !== agentId),
          {
            agentId,
            installed,
            enabled: installed ? !(existing?.enabled ?? false) : false
          }
        ]
      });
      return { settings };
    });
  },
  resetSettings() {
    const settings = settingsService.reset();
    gatewayService.setUrl(settings.gatewayUrl);
    set({ settings, connectionTest: null });
  },
  async exportDiagnostics() {
    await settingsService.exportDiagnostics(get().settings);
  },
  async clearErrorLogs() {
    await persistenceService.clearErrorLogs();
  },
  async clearOfflineQueue() {
    await gatewayService.clearOfflineQueue();
  },
  async testConnection() {
    const result = await settingsService.testConnection(get().settings.gatewayUrl);
    set({ connectionTest: result });
  }
}));
