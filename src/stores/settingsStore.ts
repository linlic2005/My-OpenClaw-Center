import { create } from "zustand";
import { getPresetEndpoints, inferDeploymentMode } from "../config/runtime";
import { createId } from "../lib/utils";
import { gatewayService, GatewayRequestError } from "../services/GatewayService";
import { persistenceService } from "../services/PersistenceService";
import { settingsService } from "../services/SettingsService";
import type { ChannelConfig, DeploymentMode, ErrorLogRecord, GatewayHealth, SettingsState } from "../types";

const initialSettings = settingsService.load();
gatewayService.setUrl(initialSettings.gatewayUrl);
void gatewayService.setAuthToken(initialSettings.gatewayAuthToken);

interface SettingsStore {
  settings: SettingsState;
  connectionTest: GatewayHealth | null;
  connectionError: string | null;
  errorLogs: ErrorLogRecord[];
  dataLoading: boolean;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  addChannel: () => void;
  updateChannel: (channelId: string, patch: Partial<ChannelConfig>) => void;
  removeChannel: (channelId: string) => void;
  toggleSkillInstalled: (agentId: string) => void;
  toggleSkillEnabled: (agentId: string) => void;
  applyDeploymentMode: (mode: DeploymentMode) => void;
  resetSettings: () => void;
  refreshDataManagement: () => Promise<void>;
  exportDiagnostics: () => Promise<void>;
  clearErrorLogs: () => Promise<void>;
  clearOfflineQueue: () => Promise<void>;
  testConnection: () => Promise<void>;
}

function persistSettings(settings: SettingsState): SettingsState {
  settingsService.save(settings);
  return settings;
}

function formatConnectionError(error: unknown, language: SettingsState["language"]): string {
  if (error instanceof GatewayRequestError) {
    const lines = [
      error.message || (language === "zh-CN" ? "连接测试失败" : "Connection test failed"),
      `code: ${error.code}`
    ];

    if (error.payload !== undefined) {
      try {
        lines.push(`payload: ${JSON.stringify(error.payload, null, 2)}`);
      } catch {
        lines.push(`payload: ${String(error.payload)}`);
      }
    }

    return lines.join("\n");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return language === "zh-CN" ? "连接测试失败" : "Connection test failed";
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: initialSettings,
  connectionTest: null,
  connectionError: null,
  errorLogs: [],
  dataLoading: false,
  update(key, value) {
    set((state) => {
      const draft = { ...state.settings, [key]: value };

      if (key === "gatewayUrl" || key === "studioUrl") {
        draft.deploymentMode = inferDeploymentMode(
          key === "gatewayUrl" ? String(value) : draft.gatewayUrl,
          key === "studioUrl" ? String(value) : draft.studioUrl
        );
      }

      const settings = persistSettings(draft);
      if (key === "gatewayUrl") {
        gatewayService.setUrl(String(value));
      }
      if (key === "gatewayAuthToken") {
        void gatewayService.setAuthToken(String(value));
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
            name: state.settings.language === "zh-CN" ? "新频道" : "New Channel",
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
  applyDeploymentMode(mode) {
    set((state) => {
      if (mode === "custom") {
        const settings = persistSettings({
          ...state.settings,
          deploymentMode: "custom"
        });
        return { settings };
      }

      const preset = getPresetEndpoints(mode);
      const settings = persistSettings({
        ...state.settings,
        deploymentMode: mode,
        gatewayUrl: preset.gatewayUrl,
        studioUrl: preset.studioUrl
      });
      gatewayService.setUrl(settings.gatewayUrl);

      return {
        settings,
        connectionTest: null,
        connectionError: null
      };
    });
  },
  resetSettings() {
    const settings = settingsService.reset();
    gatewayService.setUrl(settings.gatewayUrl);
    void gatewayService.setAuthToken(settings.gatewayAuthToken);
    set({ settings, connectionTest: null, connectionError: null });
  },
  async refreshDataManagement() {
    set({ dataLoading: true });
    const errorLogs = await settingsService.listErrorLogs(200);
    set({ errorLogs, dataLoading: false });
  },
  async exportDiagnostics() {
    await settingsService.exportDiagnostics(get().settings);
  },
  async clearErrorLogs() {
    await persistenceService.clearErrorLogs();
    await get().refreshDataManagement();
  },
  async clearOfflineQueue() {
    await gatewayService.clearOfflineQueue();
  },
  async testConnection() {
    try {
      const result = await settingsService.testConnection(get().settings.gatewayUrl);
      set({ connectionTest: result, connectionError: null });
    } catch (error) {
      set({
        connectionTest: null,
        connectionError: formatConnectionError(error, get().settings.language)
      });
    }
  }
}));
