import { useEffect } from "react";
import { pickText } from "../../lib/i18n";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function SettingsModule() {
  const { settings, connectionTest, update, testConnection } = useSettingsStore();
  const { agents, agentsLoading, refreshAgents, status } = useGatewayStore();
  const t = <T extends string>(copy: { "zh-CN": T; "en-US": T }) => pickText(settings.language, copy);

  useEffect(() => {
    if (status === "connected" && !agents.length) {
      void refreshAgents();
    }
  }, [agents.length, refreshAgents, status]);

  return (
    <div className="settings-shell">
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "Gateway 连接", "en-US": "Gateway Connection" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "管理远程 Gateway 地址、代理模式和连接检查。",
                  "en-US": "Manage the gateway endpoint, proxy mode, and connection checks."
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
                {t({ "zh-CN": "连接测试成功", "en-US": "Connection looks good" })}
              </div>
              <div className="settings-status-meta">
                Gateway {connectionTest.version} · {t({ "zh-CN": "延迟", "en-US": "Latency" })}{" "}
                {connectionTest.latency}ms · {t({ "zh-CN": "在线连接", "en-US": "Active Clients" })}{" "}
                {connectionTest.activeConnections}
              </div>
            </div>
          )}
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "外观", "en-US": "Appearance" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "统一调整语言、主题和界面密度。",
                  "en-US": "Adjust language, theme, and density in one place."
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
              <span className="settings-switch-title">{t({ "zh-CN": "紧凑模式", "en-US": "Compact Mode" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "缩小全局间距，让信息排布更紧凑。",
                  "en-US": "Reduce global spacing for a denser layout."
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
              <div className="panel-header-title">{t({ "zh-CN": "通知", "en-US": "Notifications" })}</div>
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
              <span className="settings-switch-title">{t({ "zh-CN": "启用通知", "en-US": "Enable Notifications" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "新消息和状态变化时显示系统提醒。",
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
              <span className="settings-switch-title">{t({ "zh-CN": "声音提醒", "en-US": "Sound Alerts" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "为消息和任务状态变化提供声音反馈。",
                  "en-US": "Play sound feedback for messages and task changes."
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
              <span className="settings-switch-title">{t({ "zh-CN": "离线模式", "en-US": "Offline Mode" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "断线时保留发送请求，等待连接恢复后自动补发。",
                  "en-US": "Queue requests locally while waiting for the connection to recover."
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
              <span className="settings-switch-title">{t({ "zh-CN": "启用工作室", "en-US": "Enable Workspace" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "优先嵌入 Flask Studio 页面，不可用时回退到本地像素视图。",
                  "en-US": "Embed the Flask Studio first and fall back to the local pixel view when needed."
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
              <div className="panel-header-title">{t({ "zh-CN": "技能列表", "en-US": "Skills" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "展示 Gateway 当前返回的 Agent 能力列表。",
                  "en-US": "Shows the agent capabilities currently reported by the Gateway."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={() => void refreshAgents()}>
              {t({ "zh-CN": "刷新", "en-US": "Refresh" })}
            </button>
          </div>

          <div className="skill-list settings-skill-list">
            {agentsLoading && (
              <div className="empty-state small">
                {t({ "zh-CN": "正在加载技能列表...", "en-US": "Loading agents..." })}
              </div>
            )}

            {!agentsLoading &&
              agents.map((agent) => (
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
                        : t({ "zh-CN": "已安装", "en-US": "Installed" })
                      : t({ "zh-CN": "可安装", "en-US": "Available" })}
                  </span>
                </div>
              ))}

            {!agentsLoading && !agents.length && (
              <div className="empty-state small">
                {t({
                  "zh-CN": "当前没有从 Gateway 获取到 Agent 列表。",
                  "en-US": "No agents were returned by the Gateway."
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
