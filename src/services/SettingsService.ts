import { defaultSettings } from "../data/mock";
import { gatewayService } from "./GatewayService";
import { persistenceService } from "./PersistenceService";
import type { GatewayHealth, SettingsState } from "../types";

const SETTINGS_KEY = "openclaw.settings";

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

class SettingsService {
  load(): SettingsState {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;

    try {
      return { ...defaultSettings, ...(JSON.parse(raw) as Partial<SettingsState>) };
    } catch {
      return defaultSettings;
    }
  }

  save(state: SettingsState): void {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    void persistenceService.setJson(SETTINGS_KEY, state);
  }

  reset(): SettingsState {
    const next = { ...defaultSettings };
    this.save(next);
    return next;
  }

  async testConnection(url?: string): Promise<GatewayHealth> {
    return gatewayService.probe(url);
  }

  async exportDiagnostics(state: SettingsState): Promise<void> {
    const [errorLogs] = await Promise.all([persistenceService.listErrorLogs(200)]);

    downloadJson(`openclaw-diagnostics-${Date.now()}.json`, {
      exportedAt: new Date().toISOString(),
      settings: state,
      gateway: {
        url: gatewayService.getUrl(),
        status: gatewayService.getStatus(),
        offlineQueue: gatewayService.getOfflineQueue()
      },
      errorLogs
    });
  }
}

export const settingsService = new SettingsService();
