import { useEffect } from "react";
import { pickText } from "../../lib/i18n";
import { formatFileSize, formatTime } from "../../lib/utils";
import { useFileStore } from "../../stores/fileStore";
import { useSettingsStore } from "../../stores/settingsStore";

export function FileModule() {
  const { items, selectedFileId, uploadTask, load, selectFile, uploadSample } = useFileStore();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    void load(language, "/project");
  }, [language, load]);

  const selectedFile = items.find((item) => item.id === selectedFileId) ?? null;

  return (
    <div className="file-shell">
      <div className="section-header">
        <div>
          <div className="section-title">
            {pickText(language, { "zh-CN": "文件浏览", "en-US": "File Browser" })}
          </div>
          <div className="section-meta">
            {pickText(language, {
              "zh-CN": "目录树、预览、上传进度和批量操作入口",
              "en-US": "Directory tree, preview, upload progress, and batch actions"
            })}
          </div>
        </div>
        <button className="primary-button" onClick={() => void uploadSample(language)}>
          {pickText(language, {
            "zh-CN": "上传示例文件",
            "en-US": "Upload Sample File"
          })}
        </button>
      </div>

      <div className="file-grid">
        <div className="file-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={`file-item ${selectedFileId === item.id ? "file-item-active" : ""}`}
              onClick={() => selectFile(item.id)}
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
                    "zh-CN": "该文件类型暂不支持预览",
                    "en-US": "Preview is not available for this file type"
                  })}
              </pre>
            </>
          ) : (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "选择文件后可在这里查看预览",
                "en-US": "Select a file to preview it here"
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
