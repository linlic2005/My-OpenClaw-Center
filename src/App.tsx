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
  const { language, theme, compactMode, gatewayUrl } = settings;

  useEffect(() => {
    hydrate();
    void connect(gatewayUrl).catch(() => undefined);
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
                "zh-CN": "会话、草稿、@Agent 和消息状态都在这里统一处理。",
                "en-US": "Sessions, drafts, @Agent mentions, and message states are managed here."
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
                "zh-CN": "跨列移动、冲突反馈和实时同步都由 Gateway 驱动。",
                "en-US": "Cross-column moves, conflict feedback, and live sync all come from the Gateway."
              })}
            </div>
          </div>
        );
      case "files":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "文件导航",
                "en-US": "File Navigation"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "真实目录读取与分片上传都从这里发起。",
                "en-US": "Live directory reads and chunked uploads start here."
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
                "en-US": "Studio Mode"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "优先嵌入 Flask 子服务，可用时直接显示像素工作室，不可用时回退本地视图。",
                "en-US": "The Flask subservice is embedded when available, with a local pixel fallback when it is not."
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
                "zh-CN": "Gateway、主题、通知和工作室配置都集中在这里。",
                "en-US": "Gateway, theme, notifications, and Studio configuration live here."
              })}
            </div>
          </div>
        );
    }
  }, [activeTab, language]);

  const renderConnectionScreen = (title: string, meta: string, loading = false) => (
    <div className="connection-screen">
      <div className="connection-card">
        <div className="connection-icon">{loading ? "⏳" : "📡"}</div>
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
