import { useEffect, useMemo, useState } from "react";
import { ChatModule } from "./components/chat/ChatModule";
import { FileModule } from "./components/file/FileModule";
import { KanbanModule } from "./components/kanban/KanbanModule";
import { Shell } from "./components/layout/Shell";
import { SettingsModule } from "./components/settings/SettingsModule";
import { StudioModule } from "./components/studio/StudioModule";
import { pickText } from "./lib/i18n";
import { useGatewayStore } from "./stores/gatewayStore";
import { useSettingsStore } from "./stores/settingsStore";
import type { ModuleTab } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<ModuleTab>("chat");
  const { status, connect, reconnect, hydrate } = useGatewayStore();
  const settings = useSettingsStore((state) => state.settings);
  const { language, theme, compactMode, gatewayUrl, fontSize } = settings;

  useEffect(() => {
    void hydrate().then(() => connect(gatewayUrl)).catch(() => undefined);
  }, [connect, gatewayUrl, hydrate]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("compact-mode", compactMode);
  }, [compactMode]);

  useEffect(() => {
    const root = document.documentElement;
    const sizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px"
    } as const;
    root.style.fontSize = sizeMap[fontSize];
    root.dataset.fontSize = fontSize;
  }, [fontSize]);

  const sidebar = useMemo(() => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "聊天工作台",
                "en-US": "Chat Workspace"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "会话、草稿、引用回复和 Agent 提及都集中在这里管理。",
                "en-US": "Sessions, drafts, quoted replies, and Agent mentions are managed here."
              })}
            </div>
          </div>
        );
      case "kanban":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "看板概览",
                "en-US": "Board Overview"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "跨列流转、冲突修复和卡片编辑全部走真实 Gateway 协议。",
                "en-US": "Cross-column moves, conflict recovery, and card editing all use the live Gateway protocol."
              })}
            </div>
          </div>
        );
      case "files":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "配置导航",
                "en-US": "Config Navigation"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "这里主要用于查看 Agent 的 USER.md、SOUL.md、MEMORY.md 等核心配置文件。",
                "en-US": "This area is focused on Agent config files such as USER.md, SOUL.md, and MEMORY.md."
              })}
            </div>
          </div>
        );
      case "studio":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "工作室模式",
                "en-US": "Workspace Mode"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "优先接入 Flask 子服务；不可用时回退到本地像素工作室视图。",
                "en-US": "The Flask subservice is preferred, with a local pixel workspace fallback when unavailable."
              })}
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "系统设置",
                "en-US": "System Settings"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "Gateway、主题、渠道、技能和数据管理统一在这里配置。",
                "en-US": "Gateway, theme, channels, skills, and data management live here."
              })}
            </div>
          </div>
        );
    }
  }, [activeTab, language]);

  const renderConnectionScreen = (title: string, meta: string, loading = false) => (
    <div className="connection-screen">
      <div className="connection-card">
        <div className="connection-icon">{loading ? "..." : "WS"}</div>
        <div className="section-title">{title}</div>
        <div className="section-meta">{meta}</div>
        {loading ? (
          <div className="progress-track large">
            <div className="progress-bar" style={{ width: "60%" }} />
          </div>
        ) : (
          <button className="primary-button" onClick={() => void reconnect()}>
            {pickText(language, {
              "zh-CN": "重新连接",
              "en-US": "Reconnect"
            })}
          </button>
        )}
      </div>
    </div>
  );

  const content = useMemo(() => {
    if (status === "connecting" && activeTab !== "settings") {
      return renderConnectionScreen(
        pickText(language, {
          "zh-CN": "正在连接 Gateway",
          "en-US": "Connecting to Gateway"
        }),
        gatewayUrl,
        true
      );
    }

    if (status === "disconnected" && activeTab !== "settings" && activeTab !== "studio") {
      return renderConnectionScreen(
        pickText(language, {
          "zh-CN": "连接已断开",
          "en-US": "Connection Lost"
        }),
        gatewayUrl
      );
    }

    switch (activeTab) {
      case "chat":
        return <ChatModule />;
      case "kanban":
        return <KanbanModule />;
      case "files":
        return <FileModule />;
      case "studio":
        return <StudioModule />;
      case "settings":
        return <SettingsModule />;
      default:
        return null;
    }
  }, [activeTab, gatewayUrl, language, reconnect, status]);

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab} sidebar={sidebar}>
      {content}
    </Shell>
  );
}
