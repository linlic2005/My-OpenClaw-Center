import { defaultSettings } from "../data/mock";
import { gatewayService } from "./GatewayService";
import type { GatewayHealth, SettingsState } from "../types";

const SETTINGS_KEY = "openclaw.settings";

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
  }

  async testConnection(url?: string): Promise<GatewayHealth> {
    return gatewayService.probe(url);
  }
}

export const settingsService = new SettingsService();
