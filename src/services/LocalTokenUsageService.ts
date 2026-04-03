import type { AgentProfile, AgentTokenUsageStat, GatewayTokenUsageStat } from "../types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

function toNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeUsage(raw: unknown): {
  input: number;
  output: number;
  total: number;
} {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const input = toNumber(record.input ?? record.inputTokens ?? record.promptTokens);
  const output = toNumber(record.output ?? record.outputTokens ?? record.completionTokens);
  const total = toNumber(record.totalTokens ?? record.total) || input + output;

  return { input, output, total };
}

async function readOpenClawSessionFiles(): Promise<Array<{ agentId: string; agentName: string; content: string }>> {
  const [{ homeDir, join }, fs] = await Promise.all([
    import("@tauri-apps/api/path"),
    import("@tauri-apps/plugin-fs")
  ]);
  const root = await join(await homeDir(), ".openclaw", "agents");
  const rootExists = await fs.exists(root);

  if (!rootExists) {
    return [];
  }

  const agentDirs = await fs.readDir(root);
  const results: Array<{ agentId: string; agentName: string; content: string }> = [];

  for (const agentDir of agentDirs) {
    if (!agentDir.isDirectory || !agentDir.name) continue;

    const sessionsPath = await join(root, agentDir.name, "sessions");
    const sessionsExists = await fs.exists(sessionsPath);
    if (!sessionsExists) continue;

    const sessionFiles = await fs.readDir(sessionsPath);
    for (const file of sessionFiles) {
      if (!file.isFile || !file.name?.endsWith(".jsonl")) continue;

      const fullPath = await join(sessionsPath, file.name);
      const content = await fs.readTextFile(fullPath);
      results.push({
        agentId: agentDir.name,
        agentName: agentDir.name,
        content
      });
    }
  }

  return results;
}

export class LocalTokenUsageService {
  async getTokenUsage(agents: AgentProfile[]): Promise<GatewayTokenUsageStat> {
    if (!isTauriRuntime()) {
      throw new Error("Local OpenClaw session logs are only available in Tauri runtime");
    }

    const files = await readOpenClawSessionFiles();
    if (!files.length) {
      throw new Error("No OpenClaw session logs were found");
    }

    const bucket = new Map<string, AgentTokenUsageStat>();

    for (const file of files) {
      const cached = agents.find((agent) => agent.id === file.agentId);
      const initial: AgentTokenUsageStat = bucket.get(file.agentId) ?? {
        agentId: file.agentId,
        name: cached?.name || file.agentName,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requests: 0,
        lastUpdated: 0
      };

      for (const line of file.content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          const usage = normalizeUsage(parsed.usage);
          if (!usage.total) continue;

          initial.inputTokens += usage.input;
          initial.outputTokens += usage.output;
          initial.totalTokens += usage.total;
          initial.requests += 1;

          const timestamp = typeof parsed.timestamp === "string" ? Date.parse(parsed.timestamp) : 0;
          if (Number.isFinite(timestamp) && timestamp > (initial.lastUpdated ?? 0)) {
            initial.lastUpdated = timestamp;
          }
        } catch {
          continue;
        }
      }

      bucket.set(file.agentId, initial);
    }

    const rankedAgents = [...bucket.values()]
      .filter((agent) => agent.totalTokens > 0)
      .sort((left, right) => right.totalTokens - left.totalTokens);

    if (!rankedAgents.length) {
      throw new Error("No token usage records were found in local session logs");
    }

    const totalInputTokens = rankedAgents.reduce((sum, agent) => sum + agent.inputTokens, 0);
    const totalOutputTokens = rankedAgents.reduce((sum, agent) => sum + agent.outputTokens, 0);

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: rankedAgents.reduce((sum, agent) => sum + agent.totalTokens, 0),
      totalRequests: rankedAgents.reduce((sum, agent) => sum + agent.requests, 0),
      agents: rankedAgents,
      source: "local-logs",
      updatedAt: Math.max(...rankedAgents.map((agent) => agent.lastUpdated ?? 0))
    };
  }
}

export const localTokenUsageService = new LocalTokenUsageService();
