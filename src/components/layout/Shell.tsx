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
  chat: { icon: "C", label: { "zh-CN": "聊天", "en-US": "Chat" } },
  kanban: { icon: "K", label: { "zh-CN": "看板", "en-US": "Kanban" } },
  files: { icon: "F", label: { "zh-CN": "配置", "en-US": "Configs" } },
  studio: { icon: "W", label: { "zh-CN": "工作室", "en-US": "Workspace" } },
  settings: { icon: "S", label: { "zh-CN": "设置", "en-US": "Settings" } }
};

export function Shell({ activeTab, onTabChange, sidebar, children }: ShellProps) {
  const { status, reconnectAttempt, offlineQueue, url } = useGatewayStore();
  const language = useSettingsStore((state) => state.settings.language);

  const statusLabel = useMemo(() => {
    if (status === "reconnecting") {
      return pickText(language, {
        "zh-CN": `重连中 (${reconnectAttempt}/10)`,
        "en-US": `Reconnecting (${reconnectAttempt}/10)`
      });
    }
    if (status === "connecting") {
      return pickText(language, {
        "zh-CN": "连接中",
        "en-US": "Connecting"
      });
    }
    if (status === "connected") {
      return pickText(language, {
        "zh-CN": "已连接",
        "en-US": "Connected"
      });
    }
    return pickText(language, {
      "zh-CN": "已断开",
      "en-US": "Disconnected"
    });
  }, [language, reconnectAttempt, status]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">OC</div>
          <div>
            <div className="brand-title">OpenClaw Center</div>
            <div className="brand-subtitle">
              {pickText(language, {
                "zh-CN": "远程协作工作台",
                "en-US": "Remote Control Workspace"
              })}
            </div>
          </div>
        </div>

        <nav className="tabs">
          {(Object.keys(tabLabels) as ModuleTab[]).map((tab) => (
            <button
              key={tab}
              className={cn("tab-button", activeTab === tab && "tab-button-active")}
              onClick={() => onTabChange(tab)}
            >
              <span className="tab-icon">{tabLabels[tab].icon}</span>
              {pickText(language, tabLabels[tab].label)}
            </button>
          ))}
        </nav>

        <div className="topbar-user">LL</div>
      </header>

      <div className="workspace">
        <aside className="sidebar">{sidebar}</aside>
        <main className="content">{children}</main>
      </div>

      <footer className="statusbar">
        <div className={cn("status-dot", `status-${status}`)} />
        <span>{statusLabel}</span>
        <span className="status-divider" />
        <span>{url.replace(/^wss?:\/\//, "")}</span>
        <span className="status-divider" />
        <span>
          {pickText(language, {
            "zh-CN": `离线队列: ${offlineQueue.length}`,
            "en-US": `Offline Queue: ${offlineQueue.length}`
          })}
        </span>
      </footer>
    </div>
  );
}
