import { useMemo } from "react";
import { getMockAgents } from "../../data/mock";
import { pickText } from "../../lib/i18n";
import { useSettingsStore } from "../../stores/settingsStore";

export function SettingsModule() {
  const { settings, connectionTest, update, testConnection } = useSettingsStore();
  const agents = useMemo(() => getMockAgents(settings.language), [settings.language]);
  const t = <T extends string>(copy: { "zh-CN": T; "en-US": T }) => pickText(settings.language, copy);

  return (
    <div className="settings-shell">
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">
                {t({ "zh-CN": "🔌 Gateway 连接", "en-US": "🔌 Gateway Connection" })}
              </div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "管理远程网关地址、代理方式和连接验证。",
                  "en-US": "Manage the remote gateway URL, proxy mode, and connection checks."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={() => void testConnection()}>
              {t({ "zh-CN": "测试连接", "en-US": "Test Connection" })}
            </button>
          </div>

          <label className="field settings-field">
            <span className="settings-label">{t({ "zh-CN": "Gateway 地址", "en-US": "Gateway URL" })}</span>
            <input
              className="text-input settings-input"
              value={settings.gatewayUrl}
              onChange={(event) => update("gatewayUrl", event.target.value)}
            />
          </label>

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "代理模式", "en-US": "Proxy Mode" })}</div>
            <div className="settings-pill-row">
              {([
                { key: "none", label: { "zh-CN": "无代理", "en-US": "No Proxy" } },
                { key: "http", label: { "zh-CN": "HTTP", "en-US": "HTTP" } },
                { key: "socks", label: { "zh-CN": "SOCKS", "en-US": "SOCKS" } }
              ] as const).map((mode) => (
                <button
                  key={mode.key}
                  className={`segmented settings-segmented ${settings.proxyMode === mode.key ? "segmented-active" : ""}`}
                  onClick={() => update("proxyMode", mode.key)}
                >
                  {pickText(settings.language, mode.label)}
                </button>
              ))}
            </div>
          </div>

          {connectionTest && (
            <div className="success-card settings-status-card">
              <div className="settings-status-title">
                {t({ "zh-CN": "连接状态正常", "en-US": "Connection looks good" })}
              </div>
              <div className="settings-status-meta">
                Gateway {connectionTest.version} · {t({ "zh-CN": "延迟", "en-US": "Latency" })}{" "}
                {connectionTest.latency}ms · {t({ "zh-CN": "在线客户端", "en-US": "Active Clients" })}{" "}
                {connectionTest.activeConnections}
              </div>
            </div>
          )}
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">
                {t({ "zh-CN": "🎨 外观", "en-US": "🎨 Appearance" })}
              </div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "统一调整语言、主题和界面呈现密度。",
                  "en-US": "Tune language, theme, and interface density from one place."
                })}
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "语言", "en-US": "Language" })}</div>
            <div className="settings-pill-row">
              {([
                { key: "zh-CN", label: "中文" },
                { key: "en-US", label: "English" }
              ] as const).map((option) => (
                <button
                  key={option.key}
                  className={`segmented settings-segmented ${settings.language === option.key ? "segmented-active" : ""}`}
                  onClick={() => update("language", option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "主题模式", "en-US": "Theme Mode" })}</div>
            <div className="settings-pill-row">
              {([
                { key: "light", label: { "zh-CN": "浅色", "en-US": "Light" } },
                { key: "dark", label: { "zh-CN": "深色", "en-US": "Dark" } },
                { key: "system", label: { "zh-CN": "跟随系统", "en-US": "System" } }
              ] as const).map((theme) => (
                <button
                  key={theme.key}
                  className={`segmented settings-segmented ${settings.theme === theme.key ? "segmented-active" : ""}`}
                  onClick={() => update("theme", theme.key)}
                >
                  {pickText(settings.language, theme.label)}
                </button>
              ))}
            </div>
          </div>

          <label className="field settings-field">
            <span className="settings-label">{t({ "zh-CN": "强调色", "en-US": "Accent Color" })}</span>
            <div className="settings-color-row">
              <input
                className="text-input settings-color-input"
                type="color"
                value={settings.accent}
                onChange={(event) => update("accent", event.target.value)}
              />
              <span className="settings-color-value">{settings.accent}</span>
            </div>
          </label>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">
                {t({ "zh-CN": "紧凑模式", "en-US": "Compact Mode" })}
              </span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "缩小间距，让信息展示更加紧凑。",
                  "en-US": "Reduce spacing for a denser information layout."
                })}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(event) => update("compactMode", event.target.checked)}
            />
          </label>
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">
                {t({ "zh-CN": "🔔 通知", "en-US": "🔔 Notifications" })}
              </div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "控制消息提醒、声音反馈和离线行为。",
                  "en-US": "Control alerts, sound feedback, and offline behavior."
                })}
              </div>
            </div>
          </div>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">
                {t({ "zh-CN": "启用通知", "en-US": "Enable Notifications" })}
              </span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "收到新消息和状态变化时显示系统提示。",
                  "en-US": "Show system alerts for new messages and status changes."
                })}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(event) => update("notifications", event.target.checked)}
            />
          </label>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">
                {t({ "zh-CN": "声音提示", "en-US": "Sound Alerts" })}
              </span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "播放消息和任务状态变化音效。",
                  "en-US": "Play audible feedback for messages and task changes."
                })}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => update("soundEnabled", event.target.checked)}
            />
          </label>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">
                {t({ "zh-CN": "离线模式", "en-US": "Offline Mode" })}
              </span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "断开连接时保留操作并等待重放。",
                  "en-US": "Keep actions queued locally while waiting to reconnect."
                })}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.offlineMode}
              onChange={(event) => update("offlineMode", event.target.checked)}
            />
          </label>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">
                {t({ "zh-CN": "启用工作室", "en-US": "Enable Workspace" })}
              </span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "显示像素办公室工作室视图。",
                  "en-US": "Display the pixel office workspace view."
                })}
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.studioEnabled}
              onChange={(event) => update("studioEnabled", event.target.checked)}
            />
          </label>
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">
                {t({ "zh-CN": "🧩 技能管理", "en-US": "🧩 Skill Manager" })}
              </div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "查看当前可用 Agent 技能和安装状态。",
                  "en-US": "Review available agent skills and their current install status."
                })}
              </div>
            </div>
          </div>
          <div className="skill-list settings-skill-list">
            {agents.map((agent) => (
              <div key={agent.id} className="skill-card settings-skill-card">
                <div>
                  <div className="list-title">
                    {agent.icon} {agent.name}
                  </div>
                  <div className="list-meta">{agent.description}</div>
                </div>
                <span className={`badge ${agent.enabled ? "badge-success" : ""}`}>
                  {agent.installed
                    ? agent.enabled
                      ? t({ "zh-CN": "已启用", "en-US": "Enabled" })
                      : t({ "zh-CN": "未启用", "en-US": "Disabled" })
                    : t({ "zh-CN": "可安装", "en-US": "Available" })}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
