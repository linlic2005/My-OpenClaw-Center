import { useEffect, useMemo, useRef } from "react";
import { pickText } from "../../lib/i18n";
import { formatFileSize, formatTime } from "../../lib/utils";
import { useFileStore } from "../../stores/fileStore";
import { useSettingsStore } from "../../stores/settingsStore";

function getParentPath(path: string): string | null {
  if (path === "/" || path === "/project") return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/project";
  return `/${segments.slice(0, -1).join("/")}`;
}

export function FileModule() {
  const { path, items, selectedFileId, uploadTask, load, selectFile, uploadFile } = useFileStore();
  const language = useSettingsStore((state) => state.settings.language);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void load(language, "/project");
  }, [language, load]);

  const selectedFile = items.find((item) => item.id === selectedFileId) ?? null;
  const parentPath = useMemo(() => getParentPath(path), [path]);

  return (
    <div className="file-shell">
      <div className="section-header">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "文件浏览", "en-US": "File Browser" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "基于 Gateway 目录接口的真实浏览与分片上传。",
              "en-US": "Live directory browsing and chunked uploads powered by the Gateway API."
            })}
          </div>
        </div>
        <div className="file-toolbar">
          <div className="badge file-path-pill">{path}</div>
          <button className="primary-button" onClick={() => inputRef.current?.click()}>
            {pickText(language, {
              "zh-CN": "上传文件",
              "en-US": "Upload File"
            })}
          </button>
          <input
            ref={inputRef}
            className="file-hidden-input"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void uploadFile(file, language);
              event.target.value = "";
            }}
          />
        </div>
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
              <div className="list-tail">↑</div>
            </button>
          )}

          {items.map((item) => (
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
                  {item.type === "directory" ? "📁" : "📄"} {item.name}
                </div>
                <div className="list-meta">{item.path}</div>
              </div>
              <div className="list-tail">{item.type === "directory" ? "--" : formatFileSize(item.size)}</div>
            </button>
          ))}
        </div>

        <div className="preview-panel">
          {selectedFile ? (
            <>
              <div className="panel-header">
                <span>{selectedFile.name}</span>
                <span className="muted">
                  {selectedFile.language ?? pickText(language, { "zh-CN": "文件", "en-US": "file" })} ·{" "}
                  {formatTime(selectedFile.modifiedAt, language)}
                </span>
              </div>
              <pre className="code-preview">
                {selectedFile.content ??
                  pickText(language, {
                    "zh-CN": "当前 Gateway 协议未提供文件预览内容，这里展示基础元信息。",
                    "en-US": "The current Gateway contract does not expose preview content, so this panel shows metadata only."
                  })}
              </pre>
            </>
          ) : (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "选择一个文件后可在这里查看详情。",
                "en-US": "Select a file to inspect its details here."
              })}
            </div>
          )}
        </div>
      </div>

      {uploadTask && (
        <div className={`upload-card ${uploadTask.status === "failed" ? "upload-failed" : ""}`}>
          <div className="panel-header">
            <span>📤 {uploadTask.fileName}</span>
            <span>
              {uploadTask.status === "done"
                ? pickText(language, { "zh-CN": "上传完成", "en-US": "Upload Complete" })
                : uploadTask.status === "failed"
                  ? pickText(language, { "zh-CN": "上传失败", "en-US": "Upload Failed" })
                  : pickText(language, { "zh-CN": "上传中", "en-US": "Uploading" })}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${uploadTask.progress}%` }} />
          </div>
          <div className="upload-meta">
            <span>{uploadTask.progress}%</span>
            <span>{uploadTask.speed}</span>
            <span>{uploadTask.remaining}</span>
          </div>
        </div>
      )}
    </div>
  );
}
