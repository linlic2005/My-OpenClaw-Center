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
        <section className="panel">
          <div className="panel-header">
            <span>{t({ "zh-CN": "🔌 Gateway 连接", "en-US": "🔌 Gateway Connection" })}</span>
            <button className="ghost-button" onClick={() => void testConnection()}>
              {t({ "zh-CN": "测试连接", "en-US": "Test Connection" })}
            </button>
          </div>
          <label className="field">
            <span>{t({ "zh-CN": "Gateway 地址", "en-US": "Gateway URL" })}</span>
            <input
              className="text-input"
              value={settings.gatewayUrl}
              onChange={(event) => update("gatewayUrl", event.target.value)}
            />
          </label>
          <div className="option-row">
            {([
              { key: "none", label: { "zh-CN": "无代理", "en-US": "No Proxy" } },
              { key: "http", label: { "zh-CN": "HTTP", "en-US": "HTTP" } },
              { key: "socks", label: { "zh-CN": "SOCKS", "en-US": "SOCKS" } }
            ] as const).map((mode) => (
              <button
                key={mode.key}
                className={`segmented ${settings.proxyMode === mode.key ? "segmented-active" : ""}`}
                onClick={() => update("proxyMode", mode.key)}
              >
                {pickText(settings.language, mode.label)}
              </button>
            ))}
          </div>
          {connectionTest && (
            <div className="success-card">
              {t({ "zh-CN": "连接成功", "en-US": "Connected successfully" })}, Gateway{" "}
              {connectionTest.version}, {t({ "zh-CN": "延迟", "en-US": "Latency" })}{" "}
              {connectionTest.latency}ms, {t({ "zh-CN": "在线客户端", "en-US": "Active Clients" })}{" "}
              {connectionTest.activeConnections}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">{t({ "zh-CN": "🎨 外观", "en-US": "🎨 Appearance" })}</div>
          <label className="field">
            <span>{t({ "zh-CN": "语言", "en-US": "Language" })}</span>
            <div className="option-row">
              {([
                { key: "zh-CN", label: "中文" },
                { key: "en-US", label: "English" }
              ] as const).map((option) => (
                <button
                  key={option.key}
                  className={`segmented ${settings.language === option.key ? "segmented-active" : ""}`}
                  onClick={() => update("language", option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>
          <div className="option-row">
            {([
              { key: "light", label: { "zh-CN": "浅色", "en-US": "Light" } },
              { key: "dark", label: { "zh-CN": "深色", "en-US": "Dark" } },
              { key: "system", label: { "zh-CN": "跟随系统", "en-US": "System" } }
            ] as const).map((theme) => (
              <button
                key={theme.key}
                className={`segmented ${settings.theme === theme.key ? "segmented-active" : ""}`}
                onClick={() => update("theme", theme.key)}
              >
                {pickText(settings.language, theme.label)}
              </button>
            ))}
          </div>
          <label className="field">
            <span>{t({ "zh-CN": "强调色", "en-US": "Accent Color" })}</span>
            <input
              className="text-input"
              type="color"
              value={settings.accent}
              onChange={(event) => update("accent", event.target.value)}
            />
          </label>
          <label className="switch-row">
            <span>{t({ "zh-CN": "紧凑模式", "en-US": "Compact Mode" })}</span>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(event) => update("compactMode", event.target.checked)}
            />
          </label>
        </section>

        <section className="panel">
          <div className="panel-header">{t({ "zh-CN": "🔔 通知", "en-US": "🔔 Notifications" })}</div>
          <label className="switch-row">
            <span>{t({ "zh-CN": "启用通知", "en-US": "Enable Notifications" })}</span>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(event) => update("notifications", event.target.checked)}
            />
          </label>
          <label className="switch-row">
            <span>{t({ "zh-CN": "声音提示", "en-US": "Sound Alerts" })}</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => update("soundEnabled", event.target.checked)}
            />
          </label>
          <label className="switch-row">
            <span>{t({ "zh-CN": "离线模式", "en-US": "Offline Mode" })}</span>
            <input
              type="checkbox"
              checked={settings.offlineMode}
              onChange={(event) => update("offlineMode", event.target.checked)}
            />
          </label>
          <label className="switch-row">
            <span>{t({ "zh-CN": "启用 Studio", "en-US": "Enable Studio" })}</span>
            <input
              type="checkbox"
              checked={settings.studioEnabled}
              onChange={(event) => update("studioEnabled", event.target.checked)}
            />
          </label>
        </section>

        <section className="panel">
          <div className="panel-header">{t({ "zh-CN": "🧩 技能管理", "en-US": "🧩 Skill Manager" })}</div>
          <div className="skill-list">
            {agents.map((agent) => (
              <div key={agent.id} className="skill-card">
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
