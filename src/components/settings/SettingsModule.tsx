import { useEffect, useMemo } from "react";
import { getPresetEndpoints, runtimeAppMeta } from "../../config/runtime";
import { pickText } from "../../lib/i18n";
import { formatRelativeTime } from "../../lib/utils";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function SettingsModule() {
  const {
    settings,
    connectionTest,
    connectionError,
    errorLogs,
    dataLoading,
    update,
    addChannel,
    updateChannel,
    removeChannel,
    toggleSkillInstalled,
    toggleSkillEnabled,
    applyDeploymentMode,
    resetSettings,
    refreshDataManagement,
    exportDiagnostics,
    clearErrorLogs,
    clearOfflineQueue,
    testConnection
  } = useSettingsStore();
  const { agents, agentsLoading, refreshAgents, status, offlineQueue } = useGatewayStore();

  const t = <T extends string>(copy: { "zh-CN": T; "en-US": T }) => pickText(settings.language, copy);
  const localPreset = useMemo(() => getPresetEndpoints("local"), []);
  const remotePreset = useMemo(() => getPresetEndpoints("remote"), []);
  const skillPreferenceMap = useMemo(
    () => Object.fromEntries(settings.skillPreferences.map((item) => [item.agentId, item])),
    [settings.skillPreferences]
  );

  useEffect(() => {
    void refreshDataManagement();
  }, [refreshDataManagement]);

  useEffect(() => {
    if (status === "connected" && !agents.length) {
      void refreshAgents();
    }
  }, [agents.length, refreshAgents, status]);

  const recentLogs = useMemo(() => errorLogs.slice(0, 8), [errorLogs]);

  return (
    <div className="settings-shell">
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "连接与部署", "en-US": "Connectivity & Deployment" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "管理 Gateway / Studio 地址、首次连接 Token 和部署模式。",
                  "en-US": "Manage Gateway / Studio endpoints, first-connect token, and deployment mode."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={() => void testConnection()}>
              {t({ "zh-CN": "测试 Gateway", "en-US": "Test Gateway" })}
            </button>
          </div>

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "部署方式", "en-US": "Deployment Mode" })}</div>
            <div className="settings-pill-row">
              {([
                { key: "local", label: { "zh-CN": "本地", "en-US": "Local" } },
                { key: "remote", label: { "zh-CN": "远程", "en-US": "Remote" } },
                { key: "custom", label: { "zh-CN": "自定义", "en-US": "Custom" } }
              ] as const).map((mode) => (
                <button
                  key={mode.key}
                  className={`segmented settings-segmented ${settings.deploymentMode === mode.key ? "segmented-active" : ""}`}
                  onClick={() => applyDeploymentMode(mode.key)}
                >
                  {pickText(settings.language, mode.label)}
                </button>
              ))}
            </div>
            <div className="list-meta">
              {settings.deploymentMode === "local"
                ? t({
                    "zh-CN": `当前本地预设: ${localPreset.gatewayUrl} | ${localPreset.studioUrl}`,
                    "en-US": `Current local preset: ${localPreset.gatewayUrl} | ${localPreset.studioUrl}`
                  })
                : settings.deploymentMode === "remote"
                  ? t({
                      "zh-CN": `当前远程预设: ${remotePreset.gatewayUrl} | ${remotePreset.studioUrl}`,
                      "en-US": `Current remote preset: ${remotePreset.gatewayUrl} | ${remotePreset.studioUrl}`
                    })
                  : t({
                      "zh-CN": "自定义模式下可分别填写 Gateway 和 Studio 地址。",
                      "en-US": "Custom mode lets you configure Gateway and Studio URLs separately."
                    })}
            </div>
          </div>

          <label className="field settings-field">
            <span className="settings-label">{t({ "zh-CN": "Gateway 地址", "en-US": "Gateway URL" })}</span>
            <input
              className="text-input settings-input"
              value={settings.gatewayUrl}
              onChange={(event) => update("gatewayUrl", event.target.value)}
            />
          </label>

          <label className="field settings-field">
            <span className="settings-label">{t({ "zh-CN": "Gateway Token", "en-US": "Gateway Token" })}</span>
            <input
              className="text-input settings-input"
              type="password"
              autoComplete="off"
              value={settings.gatewayAuthToken}
              onChange={(event) => update("gatewayAuthToken", event.target.value)}
              placeholder={t({
                "zh-CN": "首次连接时输入，后续可复用已配对的设备令牌。",
                "en-US": "Used for the first connect. Later reconnects can reuse the paired device."
              })}
            />
            <div className="list-meta">
              {t({
                "zh-CN": "Token 仅保存在本机，并作为 `connect.auth.token` 发送；导出诊断时会自动脱敏。",
                "en-US": "Stored locally and sent as `connect.auth.token`. Diagnostic exports redact it automatically."
              })}
            </div>
          </label>

          <label className="field settings-field">
            <span className="settings-label">{t({ "zh-CN": "Studio 地址", "en-US": "Studio URL" })}</span>
            <input
              className="text-input settings-input"
              value={settings.studioUrl}
              onChange={(event) => update("studioUrl", event.target.value)}
            />
          </label>

          {connectionTest && (
            <div className="success-card settings-status-card">
              <div className="settings-status-title">
                {t({ "zh-CN": "Gateway 连接正常", "en-US": "Gateway connection looks good" })}
              </div>
              <div className="settings-status-meta">
                Gateway {connectionTest.version} · {t({ "zh-CN": "延迟", "en-US": "Latency" })} {connectionTest.latency}ms ·{" "}
                {t({ "zh-CN": "活跃连接", "en-US": "Active Clients" })} {connectionTest.activeConnections}
              </div>
            </div>
          )}

          {connectionError && (
            <div className="danger-card settings-status-card">
              <div className="settings-status-title">
                {t({ "zh-CN": "Gateway 连接失败", "en-US": "Gateway connection failed" })}
              </div>
              <div className="settings-status-meta">{connectionError}</div>
            </div>
          )}
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "外观", "en-US": "Appearance" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "调整语言、主题、字号与界面密度。",
                  "en-US": "Adjust language, theme, font size, and interface density."
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

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "字号", "en-US": "Font Size" })}</div>
            <div className="settings-pill-row">
              {([
                { key: "small", label: { "zh-CN": "小", "en-US": "Small" } },
                { key: "medium", label: { "zh-CN": "中", "en-US": "Medium" } },
                { key: "large", label: { "zh-CN": "大", "en-US": "Large" } }
              ] as const).map((size) => (
                <button
                  key={size.key}
                  className={`segmented settings-segmented ${settings.fontSize === size.key ? "segmented-active" : ""}`}
                  onClick={() => update("fontSize", size.key)}
                >
                  {pickText(settings.language, size.label)}
                </button>
              ))}
            </div>
          </div>

          <label className="switch-row settings-switch-card">
            <div>
              <span className="settings-switch-title">{t({ "zh-CN": "紧凑模式", "en-US": "Compact Mode" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "减少全局留白，让信息更紧凑。",
                  "en-US": "Reduce spacing and make the interface denser."
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
              <div className="panel-header-title">{t({ "zh-CN": "运行选项", "en-US": "Runtime Options" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "控制通知、声音、离线队列与工作室嵌入行为。",
                  "en-US": "Control notifications, sounds, offline queue behavior, and studio embedding."
                })}
              </div>
            </div>
          </div>

          {([
            {
              key: "notifications",
              title: { "zh-CN": "启用通知", "en-US": "Enable Notifications" },
              copy: {
                "zh-CN": "新消息和状态变化时显示通知。",
                "en-US": "Show notifications for new messages and status changes."
              }
            },
            {
              key: "soundEnabled",
              title: { "zh-CN": "声音提醒", "en-US": "Sound Alerts" },
              copy: {
                "zh-CN": "在关键事件发生时播放提示音。",
                "en-US": "Play sounds for important events."
              }
            },
            {
              key: "offlineMode",
              title: { "zh-CN": "离线模式", "en-US": "Offline Mode" },
              copy: {
                "zh-CN": "断线后继续缓存请求，等待连接恢复。",
                "en-US": "Queue requests locally while waiting for the connection to recover."
              }
            },
            {
              key: "studioEnabled",
              title: { "zh-CN": "启用 Studio 嵌入", "en-US": "Enable Studio Embed" },
              copy: {
                "zh-CN": "优先显示远端 Studio，失败时自动回退到内置场景。",
                "en-US": "Prefer the remote Studio and fall back to the built-in scene when unavailable."
              }
            }
          ] as const).map((item) => (
            <label key={item.key} className="switch-row settings-switch-card">
              <div>
                <span className="settings-switch-title">{pickText(settings.language, item.title)}</span>
                <div className="settings-switch-copy">{pickText(settings.language, item.copy)}</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings[item.key])}
                onChange={(event) => update(item.key, event.target.checked as never)}
              />
            </label>
          ))}
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "关于", "en-US": "About" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "查看当前客户端版本、连接状态和运行环境信息。",
                  "en-US": "View client version, connection status, and runtime information."
                })}
              </div>
            </div>
          </div>

          <div className="settings-stack">
            <div className="settings-log-card">
              <div className="inline-actions">
                <span className="badge">{runtimeAppMeta.name}</span>
                <span className="muted">v{runtimeAppMeta.version}</span>
              </div>
              <div className="list-meta">{t({ "zh-CN": "当前连接状态", "en-US": "Current connection status" })}: {status}</div>
              <div className="list-meta">{t({ "zh-CN": "当前部署模式", "en-US": "Current deployment mode" })}: {settings.deploymentMode}</div>
              <div className="list-meta">{t({ "zh-CN": "Gateway 地址", "en-US": "Gateway URL" })}: {settings.gatewayUrl}</div>
              <div className="list-meta">{t({ "zh-CN": "Studio 地址", "en-US": "Studio URL" })}: {settings.studioUrl}</div>
            </div>
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "频道管理", "en-US": "Channels" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "维护频道名称与 Token 预览。当前只保存在本地。",
                  "en-US": "Manage channel names and token previews locally."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={addChannel}>
              {t({ "zh-CN": "新增频道", "en-US": "Add Channel" })}
            </button>
          </div>

          <div className="settings-stack">
            {settings.channels.map((channel) => (
              <div key={channel.id} className="settings-item-card">
                <div className="settings-inline-fields">
                  <input
                    className="text-input settings-input"
                    value={channel.name}
                    onChange={(event) => updateChannel(channel.id, { name: event.target.value })}
                    placeholder={t({ "zh-CN": "频道名称", "en-US": "Channel Name" })}
                  />
                  <input
                    className="text-input settings-input"
                    value={channel.tokenPreview}
                    onChange={(event) => updateChannel(channel.id, { tokenPreview: event.target.value })}
                    placeholder={t({ "zh-CN": "Token 预览", "en-US": "Token Preview" })}
                  />
                </div>
                <div className="inline-actions">
                  <span className="badge">{channel.id}</span>
                  <button className="ghost-button danger" onClick={() => removeChannel(channel.id)}>
                    {t({ "zh-CN": "删除", "en-US": "Remove" })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "Agent 与技能", "en-US": "Agents & Skills" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "展示 Gateway 返回的 Agent 列表，并保留本地安装/启用偏好。",
                  "en-US": "Show the Gateway agent roster and keep local install/enable preferences."
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
                {t({ "zh-CN": "正在加载 Agent 列表...", "en-US": "Loading agents..." })}
              </div>
            )}

            {!agentsLoading &&
              agents.map((agent) => {
                const preference = skillPreferenceMap[agent.id];
                const installed = preference?.installed ?? agent.installed;
                const enabled = preference?.enabled ?? agent.enabled;

                return (
                  <div key={agent.id} className="skill-card settings-skill-card settings-item-card">
                    <div>
                      <div className="list-title">
                        {agent.icon} {agent.name}
                      </div>
                      <div className="list-meta">{agent.description}</div>
                    </div>
                    <div className="inline-actions">
                      <span className={`badge ${enabled ? "badge-success" : ""}`}>
                        {installed
                          ? enabled
                            ? t({ "zh-CN": "已启用", "en-US": "Enabled" })
                            : t({ "zh-CN": "已安装", "en-US": "Installed" })
                          : t({ "zh-CN": "可安装", "en-US": "Available" })}
                      </span>
                      <button className="ghost-button" onClick={() => toggleSkillInstalled(agent.id)}>
                        {installed ? t({ "zh-CN": "卸载", "en-US": "Uninstall" }) : t({ "zh-CN": "安装", "en-US": "Install" })}
                      </button>
                      <button className="ghost-button" onClick={() => toggleSkillEnabled(agent.id)} disabled={!installed}>
                        {enabled ? t({ "zh-CN": "停用", "en-US": "Disable" }) : t({ "zh-CN": "启用", "en-US": "Enable" })}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="panel settings-panel settings-panel-wide">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "数据管理", "en-US": "Data Management" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "导出诊断、查看日志与离线队列，并执行清理操作。",
                  "en-US": "Export diagnostics, inspect logs and the offline queue, and run cleanup actions."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={() => void refreshDataManagement()}>
              {t({ "zh-CN": "刷新数据", "en-US": "Refresh Data" })}
            </button>
          </div>

          <div className="settings-action-grid">
            <button className="ghost-button" onClick={() => void exportDiagnostics()}>
              {t({ "zh-CN": "导出诊断包", "en-US": "Export Diagnostics" })}
            </button>
            <button className="ghost-button" onClick={() => void clearErrorLogs()}>
              {t({ "zh-CN": "清空错误日志", "en-US": "Clear Error Logs" })}
            </button>
            <button className="ghost-button" onClick={() => void clearOfflineQueue()}>
              {t({ "zh-CN": "清空离线队列", "en-US": "Clear Offline Queue" })}
            </button>
            <button className="ghost-button danger" onClick={resetSettings}>
              {t({ "zh-CN": "恢复默认设置", "en-US": "Reset Settings" })}
            </button>
          </div>

          <div className="settings-data-grid">
            <div className="settings-item-card">
              <div className="panel-header">
                <span>{t({ "zh-CN": "错误日志", "en-US": "Error Logs" })}</span>
                <span className="badge">{dataLoading ? "..." : errorLogs.length}</span>
              </div>
              {recentLogs.length ? (
                <div className="settings-stack">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="settings-log-card">
                      <div className="inline-actions">
                        <span className={`badge ${log.level === "error" ? "badge-error" : log.level === "warn" ? "badge-syncing" : ""}`}>
                          {log.level}
                        </span>
                        <span className="muted">{formatRelativeTime(log.timestamp, settings.language)}</span>
                      </div>
                      <div className="list-title">{log.module}</div>
                      <div className="list-meta">{log.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state small">
                  {t({ "zh-CN": "当前没有错误日志。", "en-US": "There are no error logs right now." })}
                </div>
              )}
            </div>

            <div className="settings-item-card">
              <div className="panel-header">
                <span>{t({ "zh-CN": "离线队列", "en-US": "Offline Queue" })}</span>
                <span className="badge">{offlineQueue.length}</span>
              </div>
              {offlineQueue.length ? (
                <div className="settings-stack">
                  {offlineQueue.slice(0, 8).map((item) => (
                    <div key={item.id} className="settings-log-card">
                      <div className="inline-actions">
                        <span className="badge">{item.type}</span>
                        <span className="muted">{formatRelativeTime(item.timestamp, settings.language)}</span>
                      </div>
                      <div className="list-meta">
                        {t({ "zh-CN": "重试次数", "en-US": "Retries" })}: {item.retries}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state small">
                  {t({ "zh-CN": "离线队列为空。", "en-US": "Offline queue is empty." })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
