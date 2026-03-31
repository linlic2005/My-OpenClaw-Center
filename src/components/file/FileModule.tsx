import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { formatFileSize, formatTime, renderMiniMarkdown } from "../../lib/utils";
import { useFileStore } from "../../stores/fileStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { FileItem } from "../../types";

const configPriority = ["USER.md", "SOUL.md", "MEMORY.md"] as const;

type ConfigPriorityName = (typeof configPriority)[number];
type ConfigViewMode = "readable" | "outline" | "raw";

interface ParsedSection {
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  body: string;
}

interface TemplateSection {
  id: string;
  title: { "zh-CN": string; "en-US": string };
  keywords: string[];
}

function normalizeConfigName(name: string): string {
  return name.toUpperCase();
}

function getParentPath(path: string): string | null {
  if (path === "/" || path === "/project") return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/project";
  return `/${segments.slice(0, -1).join("/")}`;
}

function isConfigFile(item: FileItem): boolean {
  return item.type === "file" && configPriority.includes(normalizeConfigName(item.name) as ConfigPriorityName);
}

function sortConfigItems(items: FileItem[]): FileItem[] {
  return [...items].sort((left, right) => {
    if (left.type !== right.type) return left.type === "directory" ? -1 : 1;

    const leftIndex = configPriority.indexOf(normalizeConfigName(left.name) as ConfigPriorityName);
    const rightIndex = configPriority.indexOf(normalizeConfigName(right.name) as ConfigPriorityName);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return left.name.localeCompare(right.name);
  });
}

function getConfigLabel(name: string, language: "zh-CN" | "en-US"): string {
  if (normalizeConfigName(name) === "USER.MD") return language === "zh-CN" ? "用户设定" : "User Profile";
  if (normalizeConfigName(name) === "SOUL.MD") return language === "zh-CN" ? "人格核心" : "Persona Core";
  if (normalizeConfigName(name) === "MEMORY.MD") return language === "zh-CN" ? "长期记忆" : "Memory Store";
  return name;
}

function getConfigTemplate(name: string): TemplateSection[] {
  switch (normalizeConfigName(name)) {
    case "USER.MD":
      return [
        {
          id: "role",
          title: { "zh-CN": "角色与职责", "en-US": "Role & Scope" },
          keywords: ["角色", "职责", "role", "scope", "identity", "mission"]
        },
        {
          id: "workflow",
          title: { "zh-CN": "工作方式", "en-US": "Workflow" },
          keywords: ["流程", "工作方式", "workflow", "process", "steps", "execution"]
        },
        {
          id: "constraints",
          title: { "zh-CN": "约束与边界", "en-US": "Constraints" },
          keywords: ["约束", "边界", "限制", "constraint", "boundary", "guardrail"]
        },
        {
          id: "collaboration",
          title: { "zh-CN": "协作偏好", "en-US": "Collaboration" },
          keywords: ["协作", "沟通", "collaboration", "communication", "handoff"]
        }
      ];
    case "SOUL.MD":
      return [
        {
          id: "voice",
          title: { "zh-CN": "语气与表达", "en-US": "Voice & Tone" },
          keywords: ["语气", "表达", "voice", "tone", "style"]
        },
        {
          id: "principles",
          title: { "zh-CN": "原则与价值观", "en-US": "Principles" },
          keywords: ["原则", "价值观", "principle", "values", "belief"]
        },
        {
          id: "personality",
          title: { "zh-CN": "人格特征", "en-US": "Personality" },
          keywords: ["人格", "特征", "personality", "traits", "temperament"]
        },
        {
          id: "boundaries",
          title: { "zh-CN": "行为边界", "en-US": "Behavior Boundaries" },
          keywords: ["边界", "禁忌", "boundary", "avoid", "never", "guardrail"]
        }
      ];
    case "MEMORY.MD":
      return [
        {
          id: "project",
          title: { "zh-CN": "项目背景", "en-US": "Project Context" },
          keywords: ["项目", "背景", "project", "context", "overview"]
        },
        {
          id: "decisions",
          title: { "zh-CN": "关键决策", "en-US": "Key Decisions" },
          keywords: ["决策", "结论", "decision", "resolved", "agreed"]
        },
        {
          id: "preferences",
          title: { "zh-CN": "偏好与约定", "en-US": "Preferences" },
          keywords: ["偏好", "约定", "preferences", "convention", "defaults"]
        },
        {
          id: "followups",
          title: { "zh-CN": "待跟进事项", "en-US": "Follow-ups" },
          keywords: ["待办", "跟进", "todo", "follow", "next step", "pending"]
        }
      ];
    default:
      return [];
  }
}

function parseConfigSections(content?: string): ParsedSection[] {
  const normalized = content?.trim();
  if (!normalized) return [];

  const lines = normalized.split(/\r?\n/);
  const headings = lines
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.*)$/.exec(line.trim());
      if (!match) return null;
      return {
        title: match[2].trim(),
        level: match[1].length,
        startLine: index + 1
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (!headings.length) {
    return [
      {
        title: "Document",
        level: 1,
        startLine: 1,
        endLine: lines.length,
        body: normalized
      }
    ];
  }

  return headings.map((heading, index) => {
    const nextHeading = headings[index + 1];
    const endLine = nextHeading ? nextHeading.startLine - 1 : lines.length;
    const body = lines.slice(heading.startLine, endLine).join("\n").trim();
    return {
      ...heading,
      endLine,
      body
    };
  });
}

function getSectionExcerpt(section: ParsedSection, language: "zh-CN" | "en-US"): string {
  const normalized = section.body.replace(/\s+/g, " ").trim();
  if (!normalized) return language === "zh-CN" ? "这一节目前只有标题。" : "This section currently only has a heading.";
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

function getAgentNameFromPath(path: string, language: "zh-CN" | "en-US"): string {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return language === "zh-CN" ? "项目根目录" : "Project Root";
  const directoryName = segments[segments.length - 1];
  if (directoryName.endsWith(".md") && segments.length >= 2) {
    return segments[segments.length - 2];
  }
  return directoryName;
}

function getContentStats(content: string | undefined, sections: ParsedSection[]) {
  const normalized = content?.trim() ?? "";
  const lines = normalized ? normalized.split(/\r?\n/) : [];

  return {
    lineCount: lines.length,
    charCount: normalized.length,
    sectionCount: sections.length,
    bulletCount: lines.filter((line) => /^(\s*[-*+]|\s*\d+\.)\s+/.test(line)).length,
    checklistCount: lines.filter((line) => /^\s*-\s+\[[ xX]\]/.test(line)).length
  };
}

function getTemplateMatches(name: string, sections: ParsedSection[]) {
  const sectionsWithBody = sections.map((section) => `${section.title}\n${section.body}`.toLowerCase());
  return getConfigTemplate(name).map((template) => {
    const match = sections.find((section, index) =>
      template.keywords.some((keyword) => sectionsWithBody[index].includes(keyword.toLowerCase()))
    );

    return {
      template,
      match
    };
  });
}

export function FileModule() {
  const { path, items, selectedFileId, downloadTask, load, selectFile, downloadFile } = useFileStore();
  const language = useSettingsStore((state) => state.settings.language);
  const [viewMode, setViewMode] = useState<ConfigViewMode>("readable");

  useEffect(() => {
    void load(language, "/project");
  }, [language, load]);

  const selectedFile = items.find((item) => item.id === selectedFileId) ?? null;
  const parentPath = useMemo(() => getParentPath(path), [path]);
  const visibleItems = useMemo(
    () => sortConfigItems(items.filter((item) => item.type === "directory" || isConfigFile(item))),
    [items]
  );
  const configFiles = useMemo(() => visibleItems.filter((item) => item.type === "file"), [visibleItems]);
  const configFileMap = useMemo(
    () => new Map(configFiles.map((item) => [normalizeConfigName(item.name), item])),
    [configFiles]
  );
  const parsedSections = useMemo(() => parseConfigSections(selectedFile?.content), [selectedFile?.content]);
  const contentStats = useMemo(() => getContentStats(selectedFile?.content, parsedSections), [parsedSections, selectedFile?.content]);
  const templateMatches = useMemo(
    () => (selectedFile ? getTemplateMatches(selectedFile.name, parsedSections) : []),
    [parsedSections, selectedFile]
  );
  const matchedTemplateCount = templateMatches.filter((entry) => entry.match).length;
  const selectedAgentName = useMemo(
    () => getAgentNameFromPath(selectedFile?.path ?? path, language),
    [language, path, selectedFile?.path]
  );
  const hasSelectedContent = Boolean(selectedFile?.content?.trim());

  useEffect(() => {
    setViewMode("readable");
  }, [selectedFileId]);

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
        {configPriority.map((name) => {
          const file = configFileMap.get(normalizeConfigName(name)) ?? null;
          const isActive = file?.id === selectedFileId;

          return (
            <button
              key={name}
              className={`config-chip config-chip-button ${file ? "config-chip-active" : ""} ${isActive ? "config-chip-current" : ""}`}
              onClick={() => file && selectFile(file.id)}
              disabled={!file}
            >
              <strong>{name}</strong>
              <span>{getConfigLabel(name, language)}</span>
              <span className="config-chip-meta">
                {file
                  ? `${formatFileSize(file.size)} · ${formatTime(file.modifiedAt, language)}`
                  : pickText(language, {
                      "zh-CN": "当前目录缺失",
                      "en-US": "Missing in this folder"
                    })}
              </span>
            </button>
          );
        })}
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
                <div className="list-title">{item.type === "directory" ? "[AGENT]" : item.name}</div>
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

              <div className="config-detail-grid">
                <div className="config-detail-chip">
                  <span className="label">{pickText(language, { "zh-CN": "Agent", "en-US": "Agent" })}</span>
                  <strong>{selectedAgentName}</strong>
                </div>
                <div className="config-detail-chip">
                  <span className="label">{pickText(language, { "zh-CN": "规模", "en-US": "Size" })}</span>
                  <strong>{formatFileSize(selectedFile.size)}</strong>
                  <span className="muted">
                    {pickText(language, {
                      "zh-CN": `${contentStats.lineCount} 行 / ${contentStats.charCount} 字符`,
                      "en-US": `${contentStats.lineCount} lines / ${contentStats.charCount} chars`
                    })}
                  </span>
                </div>
                <div className="config-detail-chip">
                  <span className="label">{pickText(language, { "zh-CN": "结构", "en-US": "Structure" })}</span>
                  <strong>
                    {pickText(language, {
                      "zh-CN": `${contentStats.sectionCount} 节 / ${contentStats.bulletCount} 条列表`,
                      "en-US": `${contentStats.sectionCount} sections / ${contentStats.bulletCount} bullets`
                    })}
                  </strong>
                  <span className="muted">
                    {pickText(language, {
                      "zh-CN": `${contentStats.checklistCount} 条 checklist`,
                      "en-US": `${contentStats.checklistCount} checklist items`
                    })}
                  </span>
                </div>
                <div className="config-detail-chip">
                  <span className="label">{pickText(language, { "zh-CN": "结构对照", "en-US": "Template Match" })}</span>
                  <strong>
                    {templateMatches.length
                      ? pickText(language, {
                          "zh-CN": `${matchedTemplateCount}/${templateMatches.length} 已覆盖`,
                          "en-US": `${matchedTemplateCount}/${templateMatches.length} covered`
                        })
                      : pickText(language, {
                          "zh-CN": "无推荐模板",
                          "en-US": "No suggested template"
                        })}
                  </strong>
                  <span className="muted">
                    {hasSelectedContent
                      ? pickText(language, {
                          "zh-CN": "用于快速检查章节完整度。",
                          "en-US": "Useful for checking section completeness at a glance."
                        })
                      : pickText(language, {
                          "zh-CN": "当前仅有文件元数据。",
                          "en-US": "Only metadata is available right now."
                        })}
                  </span>
                </div>
              </div>

              <div className="settings-pill-row config-view-switch">
                {([
                  { key: "readable", label: { "zh-CN": "可读视图", "en-US": "Readable" } },
                  { key: "outline", label: { "zh-CN": "结构对照", "en-US": "Outline" } },
                  { key: "raw", label: { "zh-CN": "原始内容", "en-US": "Raw" } }
                ] as const).map((mode) => (
                  <button
                    key={mode.key}
                    className={`segmented settings-segmented ${viewMode === mode.key ? "segmented-active" : ""}`}
                    onClick={() => setViewMode(mode.key)}
                  >
                    {pickText(language, mode.label)}
                  </button>
                ))}
              </div>

              {!hasSelectedContent ? (
                <div className="config-empty-note">
                  {pickText(language, {
                    "zh-CN": "当前 Gateway 协议还没有返回这份配置文件的正文，所以这里先展示结构化元数据。",
                    "en-US": "The current Gateway contract has not returned the file body yet, so the viewer is showing structured metadata first."
                  })}
                </div>
              ) : viewMode === "readable" ? (
                <div
                  className="config-readable-preview"
                  dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(selectedFile.content ?? "") }}
                />
              ) : viewMode === "outline" ? (
                <div className="config-outline-grid">
                  <div className="config-template-grid">
                    {templateMatches.length ? (
                      templateMatches.map(({ template, match }) => (
                        <div
                          key={template.id}
                          className={`config-template-card ${match ? "config-template-card-found" : "config-template-card-missing"}`}
                        >
                          <div className="inline-actions">
                            <strong>{pickText(language, template.title)}</strong>
                            <span className={`badge ${match ? "badge-success" : "badge-error"}`}>
                              {match
                                ? pickText(language, { "zh-CN": "已覆盖", "en-US": "Found" })
                                : pickText(language, { "zh-CN": "待补充", "en-US": "Missing" })}
                            </span>
                          </div>
                          <div className="list-meta">
                            {match
                              ? pickText(language, {
                                  "zh-CN": `匹配到章节：${match.title}`,
                                  "en-US": `Matched section: ${match.title}`
                                })
                              : pickText(language, {
                                  "zh-CN": "没有找到明显对应的章节标题或内容。",
                                  "en-US": "No obvious matching section title or content was found."
                                })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="config-empty-note">
                        {pickText(language, {
                          "zh-CN": "这个配置文件暂时没有预设的推荐结构。",
                          "en-US": "There is no recommended structure preset for this config file yet."
                        })}
                      </div>
                    )}
                  </div>

                  <div className="config-section-list">
                    {parsedSections.map((section) => (
                      <div key={`${section.title}-${section.startLine}`} className="config-section-card">
                        <div className="config-section-head">
                          <div>
                            <div className="list-title">{section.title}</div>
                            <div className="list-meta">
                              {pickText(language, {
                                "zh-CN": `H${section.level} · 第 ${section.startLine}-${section.endLine} 行`,
                                "en-US": `H${section.level} · lines ${section.startLine}-${section.endLine}`
                              })}
                            </div>
                          </div>
                          <span className="badge config-section-range">
                            {pickText(language, {
                              "zh-CN": `${section.body.length} 字符`,
                              "en-US": `${section.body.length} chars`
                            })}
                          </span>
                        </div>
                        <div className="config-section-excerpt">{getSectionExcerpt(section, language)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <pre className="code-preview">{selectedFile.content}</pre>
              )}
            </>
          ) : (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "选择一个配置文件后，可在这里查看 USER / SOUL / MEMORY 的详情、结构和原始内容。",
                "en-US": "Select a config file to inspect the USER / SOUL / MEMORY details, structure, and raw content here."
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
