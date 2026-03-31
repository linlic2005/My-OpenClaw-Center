import { useEffect, useMemo } from "react";
import { pickText } from "../../lib/i18n";
import { formatFileSize, formatTime } from "../../lib/utils";
import { useFileStore } from "../../stores/fileStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { FileItem } from "../../types";

const configPriority = ["USER.md", "SOUL.md", "MEMORY.md"] as const;

function getParentPath(path: string): string | null {
  if (path === "/" || path === "/project") return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/project";
  return `/${segments.slice(0, -1).join("/")}`;
}

function isConfigFile(item: FileItem): boolean {
  return item.type === "file" && configPriority.includes(item.name.toUpperCase() as (typeof configPriority)[number]);
}

function sortConfigItems(items: FileItem[]): FileItem[] {
  return [...items].sort((left, right) => {
    if (left.type !== right.type) return left.type === "directory" ? -1 : 1;

    const leftIndex = configPriority.indexOf(left.name.toUpperCase() as (typeof configPriority)[number]);
    const rightIndex = configPriority.indexOf(right.name.toUpperCase() as (typeof configPriority)[number]);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return left.name.localeCompare(right.name);
  });
}

function getConfigLabel(name: string, language: "zh-CN" | "en-US"): string {
  if (name === "USER.md") {
    return language === "zh-CN" ? "用户设定" : "User Profile";
  }
  if (name === "SOUL.md") {
    return language === "zh-CN" ? "性格灵魂" : "Persona Core";
  }
  if (name === "MEMORY.md") {
    return language === "zh-CN" ? "长期记忆" : "Memory Store";
  }
  return name;
}

export function FileModule() {
  const { path, items, selectedFileId, downloadTask, load, selectFile, downloadFile } = useFileStore();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    void load(language, "/project");
  }, [language, load]);

  const selectedFile = items.find((item) => item.id === selectedFileId) ?? null;
  const parentPath = useMemo(() => getParentPath(path), [path]);
  const visibleItems = useMemo(
    () => sortConfigItems(items.filter((item) => item.type === "directory" || isConfigFile(item))),
    [items]
  );
  const availableConfigNames = useMemo(
    () => new Set(visibleItems.filter((item) => item.type === "file").map((item) => item.name.toUpperCase())),
    [visibleItems]
  );

  return (
    <div className="file-shell">
      <div className="section-header">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "Agent 配置查看器", "en-US": "Agent Config Viewer" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "用于查看 Agent 的关键配置文件，例如 USER.md、SOUL.md 和 MEMORY.md。",
              "en-US": "Used to inspect core Agent config files such as USER.md, SOUL.md, and MEMORY.md."
            })}
          </div>
        </div>
        <div className="file-toolbar">
          <div className="badge file-path-pill">{path}</div>
          <button className="ghost-button" onClick={() => void load(language, path)}>
            {pickText(language, { "zh-CN": "刷新", "en-US": "Refresh" })}
          </button>
        </div>
      </div>

      <div className="config-summary-card">
        {configPriority.map((name) => (
          <div key={name} className={`config-chip ${availableConfigNames.has(name) ? "config-chip-active" : ""}`}>
            <strong>{name}</strong>
            <span>{getConfigLabel(name, language)}</span>
          </div>
        ))}
      </div>

      <div className="file-grid">
        <div className="file-list">
          {parentPath && (
            <button className="file-item" onClick={() => void load(language, parentPath)}>
              <div>
                <div className="list-title">..</div>
                <div className="list-meta">
                  {pickText(language, { "zh-CN": "返回上级目录", "en-US": "Go to parent folder" })}
                </div>
              </div>
              <div className="list-tail">UP</div>
            </button>
          )}

          {visibleItems.map((item) => (
            <button
              key={item.id}
              className={`file-item ${selectedFileId === item.id ? "file-item-active" : ""}`}
              onClick={() => {
                if (item.type === "directory") {
                  void load(language, item.path);
                  return;
                }
                selectFile(item.id);
              }}
            >
              <div>
                <div className="list-title">
                  {item.type === "directory" ? "[AGENT]" : item.name}
                </div>
                <div className="list-meta">
                  {item.type === "directory" ? item.path : getConfigLabel(item.name, language)}
                </div>
              </div>
              <div className="list-tail">{item.type === "directory" ? "--" : formatFileSize(item.size)}</div>
            </button>
          ))}

          {!visibleItems.length && (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "当前目录下没有发现 Agent 配置文件。",
                "en-US": "No Agent config files were found in this directory."
              })}
            </div>
          )}
        </div>

        <div className="preview-panel">
          {selectedFile ? (
            <>
              <div className="panel-header">
                <div>
                  <div className="list-title">{selectedFile.name}</div>
                  <div className="list-meta">{getConfigLabel(selectedFile.name, language)}</div>
                </div>
                <div className="file-preview-actions">
                  <span className="muted">
                    {selectedFile.language ?? "markdown"} · {formatTime(selectedFile.modifiedAt, language)}
                  </span>
                  <button className="ghost-button" onClick={() => void downloadFile(selectedFile.id)}>
                    {pickText(language, { "zh-CN": "导出副本", "en-US": "Export Copy" })}
                  </button>
                </div>
              </div>
              <pre className="code-preview">
                {selectedFile.content ??
                  pickText(language, {
                    "zh-CN": "当前 Gateway 协议尚未返回该配置文件正文，这里先显示文件元信息。",
                    "en-US": "The current Gateway contract has not returned the file body yet, so only metadata is shown here."
                  })}
              </pre>
            </>
          ) : (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "选择一个配置文件后，可在这里查看 USER / SOUL / MEMORY 的详细内容。",
                "en-US": "Select a config file to inspect the USER / SOUL / MEMORY content here."
              })}
            </div>
          )}
        </div>
      </div>

      {downloadTask && (
        <div className={`upload-card ${downloadTask.status === "failed" ? "upload-failed" : ""}`}>
          <div className="panel-header">
            <span>EXPORT {downloadTask.fileName}</span>
            <span>
              {downloadTask.status === "done"
                ? pickText(language, { "zh-CN": "导出完成", "en-US": "Export Complete" })
                : downloadTask.status === "failed"
                  ? pickText(language, { "zh-CN": "导出失败", "en-US": "Export Failed" })
                  : pickText(language, { "zh-CN": "导出中", "en-US": "Exporting" })}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${downloadTask.progress}%` }} />
          </div>
          <div className="upload-meta">
            <span>{downloadTask.progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
