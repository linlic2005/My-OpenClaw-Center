import { useMemo, type ReactNode } from "react";
import { pickText } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ModuleTab } from "../../types";

interface ShellProps {
  activeTab: ModuleTab;
  onTabChange: (tab: ModuleTab) => void;
  sidebar: ReactNode;
  children: ReactNode;
}

const tabLabels: Record<ModuleTab, { icon: string; label: Record<"zh-CN" | "en-US", string> }> = {
  overview: { icon: "MC", label: { "zh-CN": "总览", "en-US": "Overview" } },
  chat: { icon: "CH", label: { "zh-CN": "对话", "en-US": "Chat" } },
  kanban: { icon: "KB", label: { "zh-CN": "看板", "en-US": "Kanban" } },
  files: { icon: "CF", label: { "zh-CN": "配置", "en-US": "Configs" } },
  studio: { icon: "ST", label: { "zh-CN": "工作室", "en-US": "Studio" } },
  settings: { icon: "SE", label: { "zh-CN": "设置", "en-US": "Settings" } }
};

const tabCopy: Record<ModuleTab, Record<"zh-CN" | "en-US", string>> = {
  overview: {
    "zh-CN": "统一查看 Gateway、Agent 与工作室态势",
    "en-US": "Unified Gateway, agent, and workspace telemetry"
  },
  chat: {
    "zh-CN": "进入 Gateway 会话并与 Agent 协作",
    "en-US": "Open Gateway sessions and collaborate with agents"
  },
  kanban: {
    "zh-CN": "追踪跨模块任务流与冲突状态",
    "en-US": "Track task flow and cross-module conflicts"
  },
  files: {
    "zh-CN": "浏览 Agent 配置与记忆文件",
    "en-US": "Browse agent configs and memory files"
  },
  studio: {
    "zh-CN": "查看 Star Office 场景与实时工作室",
    "en-US": "Inspect the Star Office scene and live studio"
  },
  settings: {
    "zh-CN": "管理连接、主题、日志与发布配置",
    "en-US": "Manage connectivity, theme, logs, and publishing config"
  }
};

export function Shell({ activeTab, onTabChange, sidebar, children }: ShellProps) {
  const { agents, offlineQueue, reconnectAttempt, status, url } = useGatewayStore();
  const settings = useSettingsStore((state) => state.settings);

  const statusLabel = useMemo(() => {
    if (status === "reconnecting") {
      return pickText(settings.language, {
        "zh-CN": `重连中 (${reconnectAttempt}/10)`,
        "en-US": `Reconnecting (${reconnectAttempt}/10)`
      });
    }

    if (status === "connecting") {
      return pickText(settings.language, { "zh-CN": "连接中", "en-US": "Connecting" });
    }

    if (status === "connected") {
      return pickText(settings.language, { "zh-CN": "已连接", "en-US": "Connected" });
    }

    return pickText(settings.language, { "zh-CN": "已断开", "en-US": "Disconnected" });
  }, [reconnectAttempt, settings.language, status]);

  return (
    <div className="console-shell">
      <aside className="console-nav">
        <div className="console-brand">
          <div className="console-brand-mark">OC</div>
          <div>
            <div className="console-brand-title">OpenClaw Center</div>
            <div className="console-brand-copy">ClawX x Star Office</div>
          </div>
        </div>

        <nav className="console-nav-list">
          {(Object.keys(tabLabels) as ModuleTab[]).map((tab) => (
            <button
              key={tab}
              className={cn("console-nav-item", activeTab === tab && "console-nav-item-active")}
              onClick={() => onTabChange(tab)}
            >
              <span className="console-nav-icon">{tabLabels[tab].icon}</span>
              <span className="console-nav-copy">
                <strong>{pickText(settings.language, tabLabels[tab].label)}</strong>
                <span>{pickText(settings.language, tabCopy[tab])}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="console-nav-foot">
          <div className="status-dot-wrap">
            <div className={cn("status-dot", `status-${status}`)} />
            <span>{statusLabel}</span>
          </div>
          <span>{url.replace(/^wss?:\/\//, "")}</span>
        </div>
      </aside>

      <div className="console-main">
        <header className="console-header">
          <div>
            <div className="overview-eyebrow">OPENCLAW COMMAND SURFACE</div>
            <div className="console-header-title">
              {pickText(settings.language, tabLabels[activeTab].label)}
            </div>
            <div className="console-header-copy">{pickText(settings.language, tabCopy[activeTab])}</div>
          </div>

          <div className="console-header-stats">
            <div className="console-metric">
              <span>{pickText(settings.language, { "zh-CN": "Agent", "en-US": "Agents" })}</span>
              <strong>{agents.length}</strong>
            </div>
            <div className="console-metric">
              <span>{pickText(settings.language, { "zh-CN": "离线队列", "en-US": "Queue" })}</span>
              <strong>{offlineQueue.length}</strong>
            </div>
            <div className="console-metric">
              <span>{pickText(settings.language, { "zh-CN": "部署", "en-US": "Mode" })}</span>
              <strong>{settings.deploymentMode}</strong>
            </div>
          </div>
        </header>

        <div className="console-workspace">
          <main className="console-content">{children}</main>
          <aside className="console-sidebar">{sidebar}</aside>
        </div>
      </div>
    </div>
  );
}
