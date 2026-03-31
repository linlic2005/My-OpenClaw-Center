import { getMockStudioAgents } from "../data/mock";
import { getDefaultDeploymentMode, getPresetEndpoints } from "../config/runtime";
import type { AppLanguage } from "../lib/i18n";
import type { StudioAgentStatus, StudioHealth } from "../types";

function normalizeLocale(value: unknown, language: AppLanguage): StudioAgentStatus["locale"] {
  if (value === "CN" || value === "EN" || value === "JP") return value;
  return language === "zh-CN" ? "CN" : "EN";
}

function normalizeStatus(value: unknown): StudioAgentStatus["status"] {
  if (
    value === "idle" ||
    value === "writing" ||
    value === "researching" ||
    value === "executing" ||
    value === "syncing" ||
    value === "error"
  ) {
    return value;
  }
  return "idle";
}

function normalizeAgent(raw: unknown, language: AppLanguage): StudioAgentStatus {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: String(record.id ?? `studio_${Math.random().toString(36).slice(2, 8)}`),
    name: String(record.name ?? "Agent"),
    status: normalizeStatus(record.status),
    taskDescription: String(
      record.taskDescription ??
        record.task_description ??
        (language === "zh-CN" ? "等待新任务" : "Waiting for a new task")
    ),
    lastUpdated: String(record.lastUpdated ?? record.last_updated ?? new Date().toISOString()),
    locale: normalizeLocale(record.locale, language)
  };
}

class StudioService {
  private language: AppLanguage = "zh-CN";
  private baseUrl = getPresetEndpoints(getDefaultDeploymentMode()).studioUrl;

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  setBaseUrl(url: string): void {
    const nextUrl = url.trim();
    if (nextUrl) {
      this.baseUrl = nextUrl;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<StudioHealth> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Studio service is unavailable: ${response.status}`);
    }

    return (await response.json()) as StudioHealth;
  }

  async listAgents(): Promise<StudioAgentStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/all`, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Studio status request failed: ${response.status}`);
      }

      const payload = (await response.json()) as { agents?: unknown[] };
      if (!Array.isArray(payload.agents) || !payload.agents.length) {
        return getMockStudioAgents(this.language);
      }

      return payload.agents.map((agent) => normalizeAgent(agent, this.language));
    } catch {
      return getMockStudioAgents(this.language);
    }
  }
}

export const studioService = new StudioService();
