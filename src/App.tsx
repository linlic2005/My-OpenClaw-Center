import { useEffect, useMemo, useState } from "react";
import { ChatModule } from "./components/chat/ChatModule";
import { OverviewModule } from "./components/dashboard/OverviewModule";
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
  const [activeTab, setActiveTab] = useState<ModuleTab>("overview");
  const { agents, hydrate, connect, reconnect, status } = useGatewayStore();
  const settings = useSettingsStore((state) => state.settings);
  const { accent, compactMode, fontSize, gatewayUrl, language, theme } = settings;

  useEffect(() => {
    void hydrate().then(() => connect(gatewayUrl)).catch(() => undefined);
  }, [connect, gatewayUrl, hydrate]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;

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
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-strong", accent);
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--primary-strong", accent);
  }, [accent, fontSize]);

  const sidebar = useMemo(() => {
    const agentSummary = pickText(language, {
      "zh-CN": `${agents.length} 个 Agent 已进入指挥面板`,
      "en-US": `${agents.length} agents visible in the command surface`
    });

    if (activeTab === "overview") {
      return (
        <div className="console-side-stack">
          <section className="panel console-side-card">
            <div className="panel-header-title">
              {pickText(language, { "zh-CN": "整合目标", "en-US": "Integration Goal" })}
            </div>
            <div className="settings-card-copy">
              {pickText(language, {
                "zh-CN": "以 ClawX 风格主界面承载 OpenClaw gateway 能力，并融合 Star Office 的场景式 Agent 可视化。",
                "en-US": "Use a ClawX-style shell for OpenClaw gateway workflows and fuse in the Star Office agent scene."
              })}
            </div>
          </section>

          <section className="panel console-side-card">
            <div className="panel-header-title">
              {pickText(language, { "zh-CN": "当前状态", "en-US": "Current State" })}
            </div>
            <div className="console-side-list">
              <div className="console-side-list-item">
                <span>{pickText(language, { "zh-CN": "Gateway", "en-US": "Gateway" })}</span>
                <strong>{status}</strong>
              </div>
              <div className="console-side-list-item">
                <span>{pickText(language, { "zh-CN": "Agent", "en-US": "Agents" })}</span>
                <strong>{agents.length}</strong>
              </div>
              <div className="console-side-list-item">
                <span>{pickText(language, { "zh-CN": "地址", "en-US": "Endpoint" })}</span>
                <strong>{gatewayUrl.replace(/^wss?:\/\//, "")}</strong>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="console-side-stack">
        <section className="panel console-side-card">
          <div className="panel-header-title">
            {pickText(language, { "zh-CN": "模块提示", "en-US": "Module Hint" })}
          </div>
          <div className="settings-card-copy">
            {activeTab === "chat" &&
              pickText(language, {
                "zh-CN": "这里继续沿用现有 Gateway 会话能力，适合直接验证本地 openclaw gateway 的对话链路。",
                "en-US": "This keeps the existing Gateway conversation flow and is ideal for validating the local openclaw gateway chat path."
              })}
            {activeTab === "kanban" &&
              pickText(language, {
                "zh-CN": "看板保持远端协议驱动，适合观察任务状态是否随 Gateway 同步。",
                "en-US": "The board stays protocol-driven and is useful for observing Gateway task synchronization."
              })}
            {activeTab === "files" &&
              pickText(language, {
                "zh-CN": "配置查看器用于核验 Agent 的 USER / SOUL / MEMORY 文件是否可达。",
                "en-US": "Use the config viewer to inspect USER / SOUL / MEMORY accessibility for each agent."
              })}
            {activeTab === "studio" &&
              pickText(language, {
                "zh-CN": "工作室页优先嵌入 Flask Studio，失败时自动回退到 Star Office 场景视图。",
                "en-US": "The Studio page embeds Flask Studio first and falls back to the Star Office scene automatically."
              })}
            {activeTab === "settings" &&
              pickText(language, {
                "zh-CN": "设置页继续承担连接测试、日志和部署配置，是仓库发布前的重要收口页面。",
                "en-US": "Settings remains the release-readiness page for connectivity, logs, and deployment configuration."
              })}
          </div>
        </section>

        <section className="panel console-side-card">
          <div className="panel-header-title">
            {pickText(language, { "zh-CN": "Agent 快照", "en-US": "Agent Snapshot" })}
          </div>
          <div className="settings-card-copy">{agentSummary}</div>
        </section>
      </div>
    );
  }, [activeTab, agents.length, gatewayUrl, language, status]);

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
            {pickText(language, { "zh-CN": "重新连接", "en-US": "Reconnect" })}
          </button>
        )}
      </div>
    </div>
  );

  const content = useMemo(() => {
    if (activeTab === "overview") {
      return <OverviewModule onNavigate={setActiveTab} />;
    }

    if (status === "connecting" && activeTab !== "settings") {
      return renderConnectionScreen(
        pickText(language, { "zh-CN": "正在连接 Gateway", "en-US": "Connecting to Gateway" }),
        gatewayUrl,
        true
      );
    }

    if (status === "disconnected" && activeTab !== "settings" && activeTab !== "studio") {
      return renderConnectionScreen(
        pickText(language, { "zh-CN": "Gateway 连接已断开", "en-US": "Gateway Connection Lost" }),
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
