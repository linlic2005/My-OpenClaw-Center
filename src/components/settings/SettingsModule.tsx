import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { formatRelativeTime } from "../../lib/utils";
import { settingsService } from "../../services/SettingsService";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function SettingsModule() {
  const appVersion = "1.0.0";
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
    resetSettings,
    refreshDataManagement,
    exportDiagnostics,
    clearErrorLogs,
    clearOfflineQueue,
    testConnection
  } = useSettingsStore();
  const { agents, agentsLoading, refreshAgents, status, offlineQueue } = useGatewayStore();
  const t = <T extends string>(copy: { "zh-CN": T; "en-US": T }) => pickText(settings.language, copy);

  useEffect(() => {
    if (status === "connected" && !agents.length) {
      void refreshAgents();
    }
  }, [agents.length, refreshAgents, status]);

  useEffect(() => {
    void refreshDataManagement();
  }, [refreshDataManagement]);

  const skillPreferenceMap = useMemo(
    () => Object.fromEntries(settings.skillPreferences.map((item) => [item.agentId, item])),
    [settings.skillPreferences]
  );
  const [logLevelFilter, setLogLevelFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [logModuleFilter, setLogModuleFilter] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logActionFeedback, setLogActionFeedback] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const moduleKeyword = logModuleFilter.trim().toLowerCase();
    return errorLogs.filter((log) => {
      const matchesLevel = logLevelFilter === "all" ? true : log.level === logLevelFilter;
      const matchesModule = moduleKeyword ? log.module.toLowerCase().includes(moduleKeyword) : true;
      return matchesLevel && matchesModule;
    });
  }, [errorLogs, logLevelFilter, logModuleFilter]);

  const selectedLog = useMemo(
    () => filteredLogs.find((log) => log.id === selectedLogId) ?? filteredLogs[0] ?? null,
    [filteredLogs, selectedLogId]
  );

  useEffect(() => {
    if (!filteredLogs.length) {
      if (selectedLogId !== null) {
        setSelectedLogId(null);
      }
      return;
    }

    if (!selectedLogId || !filteredLogs.some((log) => log.id === selectedLogId)) {
      setSelectedLogId(filteredLogs[0].id);
    }
  }, [filteredLogs, selectedLogId]);

  useEffect(() => {
    setLogActionFeedback(null);
  }, [selectedLogId]);

  const formatLogPayload = (log: NonNullable<typeof selectedLog>) =>
    JSON.stringify(
      {
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        module: log.module,
        message: log.message,
        stack: log.stack,
        context: log.context
      },
      null,
      2
    );

  const formatAbsoluteTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString(settings.language === "zh-CN" ? "zh-CN" : "en-US", {
      hour12: false
    });

  const handleCopyLog = async (log: NonNullable<typeof selectedLog>) => {
    const payload = formatLogPayload(log);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "true");
        textarea.className = "settings-copy-buffer";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setLogActionFeedback(
        t({
          "zh-CN": "日志 JSON 已复制到剪贴板。",
          "en-US": "The log JSON was copied to the clipboard."
        })
      );
    } catch {
      setLogActionFeedback(
        t({
          "zh-CN": "复制失败，请检查剪贴板权限。",
          "en-US": "Copy failed. Please check clipboard permissions."
        })
      );
    }
  };

  const handleExportLog = (log: NonNullable<typeof selectedLog>) => {
    settingsService.exportErrorLog(log);
    setLogActionFeedback(
      t({
        "zh-CN": "已导出当前日志。",
        "en-US": "The selected log was exported."
      })
    );
  };

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
                Gateway {connectionTest.version} · {t({ "zh-CN": "延迟", "en-US": "Latency" })} {connectionTest.latency}ms ·{" "}
                {t({ "zh-CN": "在线连接", "en-US": "Active Clients" })} {connectionTest.activeConnections}
              </div>
            </div>
          )}

          {connectionError && (
            <div className="danger-card settings-status-card">
              <div className="settings-status-title">
                {t({ "zh-CN": "连接测试失败", "en-US": "Connection failed" })}
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

          <div className="settings-group">
            <div className="settings-label">{t({ "zh-CN": "字体大小", "en-US": "Font Size" })}</div>
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
              <div className="panel-header-title">{t({ "zh-CN": "关于", "en-US": "About" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "查看当前客户端版本、运行状态和基础环境信息。",
                  "en-US": "View the client version, runtime status, and basic environment details."
                })}
              </div>
            </div>
          </div>

          <div className="settings-stack">
            <div className="settings-log-card">
              <div className="inline-actions">
                <span className="badge">OpenClaw Center</span>
                <span className="muted">v{appVersion}</span>
              </div>
              <div className="list-meta">
                {t({ "zh-CN": "当前连接状态", "en-US": "Current connection status" })}: {status}
              </div>
            </div>

            <div className="settings-log-card">
              <div className="list-meta">
                {t({ "zh-CN": "当前主题", "en-US": "Theme" })}: {settings.theme}
              </div>
              <div className="list-meta">
                {t({ "zh-CN": "当前语言", "en-US": "Language" })}: {settings.language}
              </div>
              <div className="list-meta">
                {t({ "zh-CN": "字体大小", "en-US": "Font size" })}: {settings.fontSize}
              </div>
            </div>
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "通知与运行", "en-US": "Alerts & Runtime" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "控制消息提醒、声音反馈、离线模式和工作室嵌入。",
                  "en-US": "Control alerts, sound feedback, offline mode, and workspace embedding."
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
                  "zh-CN": "断线时保留请求，等待连接恢复后自动补发。",
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
              <span className="settings-switch-title">{t({ "zh-CN": "启用工作室嵌入", "en-US": "Enable Workspace Embed" })}</span>
              <div className="settings-switch-copy">
                {t({
                  "zh-CN": "优先嵌入 Flask 工作室，不可用时回退到本地像素视图。",
                  "en-US": "Embed the Flask workspace first and fall back to the local pixel view when needed."
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
              <div className="panel-header-title">{t({ "zh-CN": "渠道管理", "en-US": "Channels" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "维护 Gateway 渠道名称与 token 显示信息。",
                  "en-US": "Manage channel names and token previews used by the Gateway."
                })}
              </div>
            </div>
            <button className="ghost-button settings-action-button" onClick={addChannel}>
              {t({ "zh-CN": "新增渠道", "en-US": "Add Channel" })}
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
                    placeholder={t({ "zh-CN": "渠道名称", "en-US": "Channel Name" })}
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
                  <button
                    className="ghost-button danger"
                    onClick={() => {
                      const confirmed = window.confirm(
                        t({
                          "zh-CN": `确认删除渠道“${channel.name}”？`,
                          "en-US": `Remove channel "${channel.name}"?`
                        })
                      );
                      if (confirmed) removeChannel(channel.id);
                    }}
                  >
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
              <div className="panel-header-title">{t({ "zh-CN": "技能管理", "en-US": "Skills" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "基于 Gateway 返回的 Agent 列表进行本地安装、启用和浏览。",
                  "en-US": "Browse, install, and enable agents returned by the Gateway."
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
                        {installed
                          ? t({ "zh-CN": "卸载", "en-US": "Uninstall" })
                          : t({ "zh-CN": "安装", "en-US": "Install" })}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => toggleSkillEnabled(agent.id)}
                        disabled={!installed}
                      >
                        {enabled
                          ? t({ "zh-CN": "停用", "en-US": "Disable" })
                          : t({ "zh-CN": "启用", "en-US": "Enable" })}
                      </button>
                    </div>
                  </div>
                );
              })}

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

        <section className="panel settings-panel settings-panel-wide">
          <div className="settings-card-head">
            <div>
              <div className="panel-header-title">{t({ "zh-CN": "数据管理", "en-US": "Data Management" })}</div>
              <div className="settings-card-copy">
                {t({
                  "zh-CN": "除了导出和清理操作，这里还会展示错误日志和离线队列概览。",
                  "en-US": "In addition to cleanup and export actions, this area surfaces error logs and offline queue insights."
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
            <button
              className="ghost-button"
              onClick={() => {
                if (window.confirm(t({ "zh-CN": "确认清空错误日志？", "en-US": "Clear all error logs?" }))) {
                  void clearErrorLogs();
                }
              }}
            >
              {t({ "zh-CN": "清空错误日志", "en-US": "Clear Error Logs" })}
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                if (window.confirm(t({ "zh-CN": "确认清空离线队列？", "en-US": "Clear offline queue?" }))) {
                  void clearOfflineQueue();
                }
              }}
            >
              {t({ "zh-CN": "清空离线队列", "en-US": "Clear Offline Queue" })}
            </button>
            <button
              className="ghost-button danger"
              onClick={() => {
                if (window.confirm(t({ "zh-CN": "确认恢复默认设置？", "en-US": "Reset settings to defaults?" }))) {
                  resetSettings();
                }
              }}
            >
              {t({ "zh-CN": "恢复默认设置", "en-US": "Reset Settings" })}
            </button>
          </div>

          <div className="settings-data-grid">
            <div className="settings-item-card">
              <div className="panel-header">
                <span>{t({ "zh-CN": "错误日志", "en-US": "Error Logs" })}</span>
                <span className="badge">
                  {dataLoading ? "..." : `${filteredLogs.length}/${errorLogs.length}`}
                </span>
              </div>
              {errorLogs.length ? (
                <div className="settings-stack">
                  <div className="settings-log-toolbar">
                    <div className="settings-pill-row settings-log-level-row">
                      {([
                        { key: "all", label: { "zh-CN": "全部级别", "en-US": "All Levels" } },
                        { key: "error", label: { "zh-CN": "错误", "en-US": "Errors" } },
                        { key: "warn", label: { "zh-CN": "警告", "en-US": "Warnings" } },
                        { key: "info", label: { "zh-CN": "信息", "en-US": "Info" } }
                      ] as const).map((filter) => (
                        <button
                          key={filter.key}
                          className={`segmented settings-segmented ${logLevelFilter === filter.key ? "segmented-active" : ""}`}
                          onClick={() => setLogLevelFilter(filter.key)}
                        >
                          {pickText(settings.language, filter.label)}
                        </button>
                      ))}
                    </div>

                    <label className="field settings-field settings-log-module-filter">
                      <span className="settings-label">
                        {t({ "zh-CN": "模块过滤", "en-US": "Module Filter" })}
                      </span>
                      <input
                        className="text-input settings-input"
                        value={logModuleFilter}
                        onChange={(event) => setLogModuleFilter(event.target.value)}
                        placeholder={t({
                          "zh-CN": "输入模块名，例如 gateway / settings",
                          "en-US": "Filter by module, for example gateway or settings"
                        })}
                      />
                    </label>
                  </div>

                  {filteredLogs.length ? (
                    <div className="settings-log-browser">
                      <div className="settings-log-list">
                        {filteredLogs.map((log) => (
                          <button
                            key={log.id}
                            className={`settings-log-card settings-log-entry ${selectedLog?.id === log.id ? "settings-log-entry-active" : ""}`}
                            onClick={() => setSelectedLogId(log.id)}
                          >
                            <div className="inline-actions">
                              <span
                                className={`badge ${
                                  log.level === "error"
                                    ? "badge-error"
                                    : log.level === "warn"
                                      ? "badge-syncing"
                                      : ""
                                }`}
                              >
                                {log.level}
                              </span>
                              <span className="muted">{formatRelativeTime(log.timestamp, settings.language)}</span>
                            </div>
                            <div className="list-title">{log.module}</div>
                            <div className="list-meta">{log.message}</div>
                          </button>
                        ))}
                      </div>

                      {selectedLog && (
                        <div className="settings-log-detail">
                          <div className="panel-header">
                            <div>
                              <div className="list-title">{selectedLog.module}</div>
                              <div className="list-meta">{formatAbsoluteTime(selectedLog.timestamp)}</div>
                            </div>
                            <div className="inline-actions">
                              <span
                                className={`badge ${
                                  selectedLog.level === "error"
                                    ? "badge-error"
                                    : selectedLog.level === "warn"
                                      ? "badge-syncing"
                                      : ""
                                }`}
                              >
                                {selectedLog.level}
                              </span>
                              <button className="ghost-button" onClick={() => void handleCopyLog(selectedLog)}>
                                {t({ "zh-CN": "复制 JSON", "en-US": "Copy JSON" })}
                              </button>
                              <button className="ghost-button" onClick={() => handleExportLog(selectedLog)}>
                                {t({ "zh-CN": "导出单条", "en-US": "Export Log" })}
                              </button>
                            </div>
                          </div>

                          <div className="settings-log-detail-grid">
                            <div className="settings-log-detail-section">
                              <div className="settings-label">{t({ "zh-CN": "消息", "en-US": "Message" })}</div>
                              <div className="settings-log-detail-copy">{selectedLog.message}</div>
                            </div>

                            <div className="settings-log-detail-section">
                              <div className="settings-label">{t({ "zh-CN": "上下文", "en-US": "Context" })}</div>
                              <pre className="settings-log-detail-code">
                                {selectedLog.context ?? t({ "zh-CN": "无上下文", "en-US": "No context" })}
                              </pre>
                            </div>

                            <div className="settings-log-detail-section">
                              <div className="settings-label">{t({ "zh-CN": "堆栈", "en-US": "Stack" })}</div>
                              <pre className="settings-log-detail-code">
                                {selectedLog.stack ?? t({ "zh-CN": "无堆栈", "en-US": "No stack trace" })}
                              </pre>
                            </div>

                            {logActionFeedback && <div className="list-meta">{logActionFeedback}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      {t({
                        "zh-CN": "当前筛选条件下没有匹配的日志。",
                        "en-US": "No logs match the current filters."
                      })}
                    </div>
                  )}
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
                  {offlineQueue.slice(0, 6).map((item) => (
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
