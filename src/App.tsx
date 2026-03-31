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
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    hydrate();
    void connect();
  }, [connect, hydrate]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
                "zh-CN": "会话、草稿、@Agent 和消息状态在这里统一管理。",
                "en-US": "Sessions, drafts, @Agent mentions, and message states live here."
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
                "zh-CN": "支持列内排序、跨列移动与实时同步提示。",
                "en-US": "Includes card ordering, cross-column moves, and sync feedback."
              })}
            </div>
          </div>
        );
      case "files":
        return (
          <div className="sidebar-card">
            <div className="sidebar-title">
              {pickText(language, {
                "zh-CN": "目录导航",
                "en-US": "Directory Navigation"
              })}
            </div>
            <div className="sidebar-copy">
              {pickText(language, {
                "zh-CN": "文件预览、上传进度和远端目录联动都从这里开始。",
                "en-US": "File preview, upload progress, and remote browsing start here."
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
                "zh-CN": "后续可嵌入 Flask 页面，接入 live_status.json 实时可视化。",
                "en-US": "Ready for Flask iframe integration and live_status.json visualization."
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
                "zh-CN": "Gateway、主题、通知、技能和 Studio 开关统一维护。",
                "en-US": "Manage gateway, theme, notifications, skills, and Studio options."
              })}
            </div>
          </div>
        );
    }
  }, [activeTab, language]);

  const content = useMemo(() => {
    if (status === "disconnected") {
      return (
        <div className="connection-screen">
          <div className="connection-card">
            <div className="connection-icon">🖥️</div>
            <div className="section-title">
              {pickText(language, {
                "zh-CN": "连接断开",
                "en-US": "Connection Lost"
              })}
            </div>
            <div className="section-meta">
              {pickText(language, {
                "zh-CN": "无法连接到 ws://192.168.123.115:18789",
                "en-US": "Unable to reach ws://192.168.123.115:18789"
              })}
            </div>
            <button className="primary-button" onClick={() => void reconnect()}>
              {pickText(language, {
                "zh-CN": "重新连接",
                "en-US": "Reconnect"
              })}
            </button>
          </div>
        </div>
      );
    }

    if (status === "connecting") {
      return (
        <div className="connection-screen">
          <div className="connection-card">
            <div className="connection-icon">⏳</div>
            <div className="section-title">
              {pickText(language, {
                "zh-CN": "正在连接 Gateway",
                "en-US": "Connecting to Gateway"
              })}
            </div>
            <div className="progress-track large">
              <div className="progress-bar" style={{ width: "60%" }} />
            </div>
          </div>
        </div>
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
  }, [activeTab, language, reconnect, status]);

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab} sidebar={sidebar}>
      {content}
    </Shell>
  );
}
