import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { formatRelativeTime } from "../../lib/utils";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useStudioStore } from "../../stores/studioStore";
import { OfficeScene } from "../studio/OfficeScene";
import type { AgentProfile, ModuleTab, StudioAgentStatus } from "../../types";

interface OverviewModuleProps {
  onNavigate: (tab: Exclude<ModuleTab, "overview">) => void;
}

function getStatusLabel(
  language: "zh-CN" | "en-US",
  status: AgentProfile["status"] | StudioAgentStatus["status"]
) {
  return {
    idle: pickText(language, { "zh-CN": "待命", "en-US": "Idle" }),
    writing: pickText(language, { "zh-CN": "写作中", "en-US": "Writing" }),
    researching: pickText(language, { "zh-CN": "研究中", "en-US": "Researching" }),
    executing: pickText(language, { "zh-CN": "执行中", "en-US": "Executing" }),
    syncing: pickText(language, { "zh-CN": "同步中", "en-US": "Syncing" }),
    offline: pickText(language, { "zh-CN": "离线", "en-US": "Offline" }),
    error: pickText(language, { "zh-CN": "异常", "en-US": "Error" })
  }[status];
}

function toStudioProjection(agent: AgentProfile): StudioAgentStatus {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    taskDescription: agent.description || "Waiting for routing",
    lastUpdated: agent.updatedAt ? new Date(agent.updatedAt).toISOString() : new Date().toISOString(),
    locale: "CN"
  };
}

function formatTokenCount(value: number, language: "zh-CN" | "en-US") {
  return new Intl.NumberFormat(language === "zh-CN" ? "zh-CN" : "en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const {
    agents,
    agentsLoading,
    offlineQueue,
    reconnect,
    refreshAgents,
    refreshTokenUsage,
    status,
    tokenUsage,
    tokenUsageLoading
  } = useGatewayStore();
  const studioAgents = useStudioStore((state) => state.agents);
  const loadStudio = useStudioStore((state) => state.load);
  const settings = useSettingsStore((state) => state.settings);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "connected") {
      void refreshAgents();
      void refreshTokenUsage();
    }
  }, [refreshAgents, refreshTokenUsage, status]);

  useEffect(() => {
    void loadStudio(settings.language, settings.studioUrl);
  }, [loadStudio, settings.language, settings.studioUrl]);

  const filteredAgents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return agents;

    return agents.filter((agent) =>
      [agent.name, agent.description, agent.kind, agent.role, ...agent.tags, ...agent.capabilities]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [agents, query]);

  const projectedStudioAgents = useMemo(
    () => (studioAgents.length ? studioAgents : agents.map(toStudioProjection)),
    [agents, studioAgents]
  );

  const counts = useMemo(() => {
    return agents.reduce(
      (acc, agent) => {
        acc.total += 1;
        if (agent.status === "offline") acc.offline += 1;
        else if (agent.status === "error") acc.error += 1;
        else if (agent.status === "idle") acc.idle += 1;
        else acc.busy += 1;
        return acc;
      },
      { total: 0, busy: 0, idle: 0, offline: 0, error: 0 }
    );
  }, [agents]);

  const gatewayStatusLabel = useMemo(
    () =>
      ({
        connected: pickText(settings.language, { "zh-CN": "已连接", "en-US": "Connected" }),
        connecting: pickText(settings.language, { "zh-CN": "连接中", "en-US": "Connecting" }),
        reconnecting: pickText(settings.language, { "zh-CN": "重连中", "en-US": "Reconnecting" }),
        disconnected: pickText(settings.language, { "zh-CN": "已断开", "en-US": "Disconnected" })
      })[status],
    [settings.language, status]
  );

  const quickActions = useMemo(
    () => [
      {
        tab: "chat" as const,
        title: pickText(settings.language, { "zh-CN": "对话", "en-US": "Chat" }),
        copy: pickText(settings.language, {
          "zh-CN": "进入 Gateway 会话并直接向 Agent 发消息。",
          "en-US": "Open Gateway conversations and message agents directly."
        })
      },
      {
        tab: "kanban" as const,
        title: pickText(settings.language, { "zh-CN": "看板", "en-US": "Kanban" }),
        copy: pickText(settings.language, {
          "zh-CN": "查看跨 Agent 的任务流和冲突状态。",
          "en-US": "Inspect cross-agent workflows and conflict states."
        })
      },
      {
        tab: "files" as const,
        title: pickText(settings.language, { "zh-CN": "配置", "en-US": "Configs" }),
        copy: pickText(settings.language, {
          "zh-CN": "浏览 USER / SOUL / MEMORY 等关键配置。",
          "en-US": "Browse USER / SOUL / MEMORY and other core configs."
        })
      },
      {
        tab: "studio" as const,
        title: pickText(settings.language, { "zh-CN": "工作室", "en-US": "Studio" }),
        copy: pickText(settings.language, {
          "zh-CN": "进入完整 Star Office 实时场景视图。",
          "en-US": "Open the full Star Office live workspace."
        })
      }
    ],
    [settings.language]
  );

  return (
    <div className="overview-shell">
      <section className="overview-hero panel">
        <div className="overview-hero-copy">
          <div className="overview-eyebrow">OPENCLAW MISSION CONTROL</div>
          <div className="section-title">
            {pickText(settings.language, {
              "zh-CN": "ClawX 风格主控台",
              "en-US": "ClawX-style Command Center"
            })}
          </div>
          <div className="section-meta">
            {pickText(settings.language, {
              "zh-CN": "把 Gateway 连接、Agent 总览、Token 使用量和 Star Office 工作室场景统一在一个主界面里。",
              "en-US": "Unify Gateway telemetry, agent overview, token usage, and the Star Office workspace in one surface."
            })}
          </div>
        </div>

        <div className="overview-hero-actions">
          <button className="ghost-button" onClick={() => void refreshAgents()}>
            {pickText(settings.language, { "zh-CN": "刷新 Agent", "en-US": "Refresh Agents" })}
          </button>
          <button className="ghost-button" onClick={() => void refreshTokenUsage()}>
            {pickText(settings.language, { "zh-CN": "刷新 Token 统计", "en-US": "Refresh Token Stats" })}
          </button>
          <button className="primary-button" onClick={() => void reconnect()}>
            {pickText(settings.language, { "zh-CN": "重连 Gateway", "en-US": "Reconnect Gateway" })}
          </button>
        </div>
      </section>

      <section className="overview-stats overview-stats-5">
        <article className="panel overview-stat-card">
          <span className="overview-stat-label">
            {pickText(settings.language, { "zh-CN": "Gateway", "en-US": "Gateway" })}
          </span>
          <strong>{gatewayStatusLabel}</strong>
          <span className="list-meta">{settings.gatewayUrl}</span>
        </article>

        <article className="panel overview-stat-card">
          <span className="overview-stat-label">
            {pickText(settings.language, { "zh-CN": "Agent 总数", "en-US": "Total Agents" })}
          </span>
          <strong>{counts.total}</strong>
          <span className="list-meta">
            {pickText(settings.language, {
              "zh-CN": `忙碌 ${counts.busy} / 待命 ${counts.idle}`,
              "en-US": `${counts.busy} busy / ${counts.idle} idle`
            })}
          </span>
        </article>

        <article className="panel overview-stat-card">
          <span className="overview-stat-label">
            {pickText(settings.language, { "zh-CN": "总 Token 使用量", "en-US": "Total Token Usage" })}
          </span>
          <strong>{formatTokenCount(tokenUsage.totalTokens, settings.language)}</strong>
          <span className="list-meta">
            {pickText(settings.language, {
              "zh-CN": `输入 ${formatTokenCount(tokenUsage.totalInputTokens, settings.language)} / 输出 ${formatTokenCount(tokenUsage.totalOutputTokens, settings.language)}`,
              "en-US": `In ${formatTokenCount(tokenUsage.totalInputTokens, settings.language)} / Out ${formatTokenCount(tokenUsage.totalOutputTokens, settings.language)}`
            })}
          </span>
        </article>

        <article className="panel overview-stat-card">
          <span className="overview-stat-label">
            {pickText(settings.language, { "zh-CN": "Token 请求数", "en-US": "Token Requests" })}
          </span>
          <strong>{formatTokenCount(tokenUsage.totalRequests, settings.language)}</strong>
          <span className="list-meta">
            {tokenUsageLoading
              ? pickText(settings.language, { "zh-CN": "统计刷新中", "en-US": "Refreshing stats" })
              : tokenUsage.source === "gateway"
                ? pickText(settings.language, { "zh-CN": "来自 Gateway", "en-US": "From Gateway" })
                : tokenUsage.source === "local-logs"
                  ? pickText(settings.language, { "zh-CN": "来自本地会话日志", "en-US": "From local session logs" })
                : pickText(settings.language, { "zh-CN": "使用回退统计", "en-US": "Using fallback stats" })}
          </span>
        </article>

        <article className="panel overview-stat-card">
          <span className="overview-stat-label">
            {pickText(settings.language, { "zh-CN": "离线队列", "en-US": "Offline Queue" })}
          </span>
          <strong>{offlineQueue.length}</strong>
          <span className="list-meta">
            {pickText(settings.language, {
              "zh-CN": settings.deploymentMode === "local" ? "本地模式" : "远程模式",
              "en-US": settings.deploymentMode === "local" ? "Local mode" : "Remote mode"
            })}
          </span>
        </article>
      </section>

      <section className="overview-grid">
        <div className="overview-main">
          <section className="panel overview-panel">
            <div className="section-header">
              <div>
                <div className="panel-header-title">
                  {pickText(settings.language, { "zh-CN": "工作室态势图", "en-US": "Workspace Scene" })}
                </div>
                <div className="section-meta">
                  {pickText(settings.language, {
                    "zh-CN": "Star Office 风格的 Agent 场景图，优先使用 Studio 数据，没有就回退到 Gateway Agent 状态。",
                    "en-US": "A Star Office style workspace scene using Studio data first, then Gateway agent state."
                  })}
                </div>
              </div>
              <span className="badge">
                {pickText(settings.language, {
                  "zh-CN": `${projectedStudioAgents.length} 个席位`,
                  "en-US": `${projectedStudioAgents.length} seats`
                })}
              </span>
            </div>

            <OfficeScene
              agents={projectedStudioAgents}
              language={settings.language}
              mode="compact"
              badge={pickText(settings.language, {
                "zh-CN": "Star Office 已接入",
                "en-US": "Star Office online"
              })}
            />
          </section>

          <section className="panel overview-panel">
            <div className="section-header">
              <div>
                <div className="panel-header-title">
                  {pickText(settings.language, { "zh-CN": "快速入口", "en-US": "Quick Access" })}
                </div>
                <div className="section-meta">
                  {pickText(settings.language, {
                    "zh-CN": "保持现有能力模块，但把它们纳入新的主控台工作流。",
                    "en-US": "Keep existing capability modules but fold them into the new command flow."
                  })}
                </div>
              </div>
            </div>

            <div className="overview-quick-grid">
              {quickActions.map((action) => (
                <button
                  key={action.tab}
                  className="overview-quick-card"
                  onClick={() => onNavigate(action.tab)}
                >
                  <strong>{action.title}</strong>
                  <span>{action.copy}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="overview-side">
          <section className="panel overview-panel">
            <div className="section-header">
              <div>
                <div className="panel-header-title">
                  {pickText(settings.language, { "zh-CN": "Agent Token 使用排行", "en-US": "Agent Token Leaderboard" })}
                </div>
                <div className="section-meta">
                  {pickText(settings.language, {
                    "zh-CN": "展示各 Agent 的 token 用量排行，帮助快速识别高使用量 Agent。",
                    "en-US": "Rank agents by token usage to spot high-volume agents quickly."
                  })}
                </div>
              </div>
              <span className="badge">{tokenUsage.agents.length}</span>
            </div>

            <div className="usage-list">
              {tokenUsage.agents.slice(0, 8).map((agent, index) => {
                const width = tokenUsage.totalTokens ? Math.max((agent.totalTokens / tokenUsage.totalTokens) * 100, 6) : 6;

                return (
                  <div key={agent.agentId} className="usage-item">
                    <div className="usage-item-head">
                      <div>
                        <div className="list-title">
                          #{index + 1} {agent.name}
                        </div>
                        <div className="list-meta">
                          {pickText(settings.language, {
                            "zh-CN": `请求 ${agent.requests} 次`,
                            "en-US": `${agent.requests} requests`
                          })}
                        </div>
                      </div>
                      <strong>{formatTokenCount(agent.totalTokens, settings.language)}</strong>
                    </div>
                    <div className="usage-bar">
                      <div className="usage-bar-fill" style={{ width: `${width}%` }} />
                    </div>
                    <div className="usage-item-meta">
                      <span>
                        {pickText(settings.language, {
                          "zh-CN": `输入 ${formatTokenCount(agent.inputTokens, settings.language)}`,
                          "en-US": `In ${formatTokenCount(agent.inputTokens, settings.language)}`
                        })}
                      </span>
                      <span>
                        {pickText(settings.language, {
                          "zh-CN": `输出 ${formatTokenCount(agent.outputTokens, settings.language)}`,
                          "en-US": `Out ${formatTokenCount(agent.outputTokens, settings.language)}`
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {!tokenUsage.agents.length && (
                <div className="empty-state small">
                  {pickText(settings.language, {
                    "zh-CN": "当前没有可展示的 token 统计。",
                    "en-US": "No token statistics are available right now."
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="panel overview-panel">
            <div className="section-header">
              <div>
                <div className="panel-header-title">
                  {pickText(settings.language, { "zh-CN": "Agent 名册", "en-US": "Agent Roster" })}
                </div>
                <div className="section-meta">
                  {pickText(settings.language, {
                    "zh-CN": "这里汇总展示 Gateway 返回的 Agent 关键信息。",
                    "en-US": "A consolidated view of the agent metadata returned by the Gateway."
                  })}
                </div>
              </div>
              <span className="badge">{agentsLoading ? "..." : counts.total}</span>
            </div>

            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={pickText(settings.language, {
                "zh-CN": "搜索 Agent / role / capability",
                "en-US": "Search agent / role / capability"
              })}
            />

            <div className="overview-agent-list">
              {filteredAgents.map((agent) => (
                <article key={agent.id} className="overview-agent-card">
                  <div className="overview-agent-head">
                    <div>
                      <div className="list-title">
                        {agent.icon} {agent.name}
                      </div>
                      <div className="list-meta">{agent.description || agent.kind || agent.id}</div>
                    </div>
                    <span className={`badge badge-${agent.status === "error" ? "error" : agent.status === "offline" ? "idle" : "success"}`}>
                      {getStatusLabel(settings.language, agent.status)}
                    </span>
                  </div>

                  <div className="overview-agent-meta">
                    <span>{agent.role ?? "operator"}</span>
                    <span>{agent.kind ?? "general"}</span>
                    <span>{agent.channel ?? pickText(settings.language, { "zh-CN": "默认通道", "en-US": "default channel" })}</span>
                  </div>

                  {!!agent.capabilities.length && (
                    <div className="overview-tag-row">
                      {agent.capabilities.slice(0, 4).map((capability) => (
                        <span key={capability} className="link-chip">
                          {capability}
                        </span>
                      ))}
                    </div>
                  )}

                  {!!agent.scopes.length && (
                    <div className="list-meta">
                      {pickText(settings.language, { "zh-CN": "Scopes", "en-US": "Scopes" })}: {agent.scopes.join(", ")}
                    </div>
                  )}

                  <div className="overview-agent-footer">
                    <span>{agent.id}</span>
                    <span>
                      {agent.updatedAt
                        ? formatRelativeTime(agent.updatedAt, settings.language)
                        : pickText(settings.language, { "zh-CN": "刚同步", "en-US": "Fresh sync" })}
                    </span>
                  </div>
                </article>
              ))}

              {!filteredAgents.length && (
                <div className="empty-state small">
                  {pickText(settings.language, {
                    "zh-CN": "当前没有匹配的 Agent。",
                    "en-US": "No agents matched your search."
                  })}
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
