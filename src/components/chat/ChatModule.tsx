import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { formatRelativeTime, formatTime, renderMiniMarkdown } from "../../lib/utils";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ChatMessage, FileItem } from "../../types";

const configPriority = ["USER.md", "SOUL.md", "MEMORY.md"] as const;

function getReplyMessage(messages: ChatMessage[], replyTo: string | null | undefined): ChatMessage | null {
  if (!replyTo) return null;
  return messages.find((item) => item.id === replyTo) ?? null;
}

function isConfigFile(item: FileItem): boolean {
  return item.type === "file" && configPriority.includes(item.name.toUpperCase() as (typeof configPriority)[number]);
}

function getConfigLabel(name: string, language: "zh-CN" | "en-US"): string {
  if (name.toUpperCase() === "USER.MD") return language === "zh-CN" ? "用户设定" : "User Profile";
  if (name.toUpperCase() === "SOUL.MD") return language === "zh-CN" ? "人格核心" : "Persona Core";
  if (name.toUpperCase() === "MEMORY.MD") return language === "zh-CN" ? "长期记忆" : "Memory Store";
  return name;
}

export function ChatModule() {
  const {
    sessions,
    currentSessionId,
    messages,
    drafts,
    loading,
    load,
    createSession,
    deleteSession,
    selectSession,
    setDraft,
    sendMessage,
    retryMessage
  } = useChatStore();
  const { agents, refreshAgents, status } = useGatewayStore();
  const { items: fileItems, load: loadFiles } = useFileStore();
  const language = useSettingsStore((state) => state.settings.language);
  const [showMention, setShowMention] = useState(false);
  const [sessionQuery, setSessionQuery] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<FileItem[]>([]);

  useEffect(() => {
    void load(language);
  }, [language, load]);

  useEffect(() => {
    if (status === "connected" && !agents.length) {
      void refreshAgents();
    }
  }, [agents.length, refreshAgents, status]);

  useEffect(() => {
    if (showAttachmentPicker) {
      void loadFiles(language, "/project");
    }
  }, [language, loadFiles, showAttachmentPicker]);

  useEffect(() => {
    if (!currentSessionId) {
      setReplyToId(null);
      setShowMention(false);
      setShowAttachmentPicker(false);
      setSelectedAttachments([]);
    }
  }, [currentSessionId]);

  const currentSession = sessions.find((item) => item.id === currentSessionId) ?? null;
  const currentMessages = currentSessionId ? messages[currentSessionId] ?? [] : [];
  const currentDraft = currentSessionId ? drafts[currentSessionId] ?? "" : "";
  const replyTarget = getReplyMessage(currentMessages, replyToId);

  const filteredSessions = useMemo(() => {
    const keyword = sessionQuery.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((session) => `${session.name} ${session.summary}`.toLowerCase().includes(keyword));
  }, [sessionQuery, sessions]);

  const selectedMentions = useMemo(
    () => agents.filter((agent) => currentDraft.includes(`[Agent:${agent.id}]`)).map((agent) => agent.id),
    [agents, currentDraft]
  );

  const attachmentCandidates = useMemo(
    () => fileItems.filter(isConfigFile).slice(0, 12),
    [fileItems]
  );

  const selectedAttachmentIds = useMemo(
    () => selectedAttachments.map((item) => item.id),
    [selectedAttachments]
  );

  const handleSend = () => {
    if (!currentSession || !currentDraft.trim()) return;
    void sendMessage(currentSession.id, currentDraft.trim(), selectedMentions, replyToId, selectedAttachmentIds);
    setReplyToId(null);
    setShowMention(false);
    setShowAttachmentPicker(false);
    setSelectedAttachments([]);
  };

  return (
    <div className="module-shell">
      <div className="panel">
        <div className="panel-header">
          <span>{pickText(language, { "zh-CN": "会话", "en-US": "Sessions" })}</span>
          <button className="ghost-button" onClick={() => void createSession()}>
            {pickText(language, { "zh-CN": "+ 新建", "en-US": "+ New" })}
          </button>
        </div>

        <input
          className="search-input"
          placeholder={pickText(language, {
            "zh-CN": "搜索会话",
            "en-US": "Search sessions"
          })}
          value={sessionQuery}
          onChange={(event) => setSessionQuery(event.target.value)}
        />

        <div className="list-column">
          {loading && (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "正在加载会话...",
                "en-US": "Loading sessions..."
              })}
            </div>
          )}

          {!loading &&
            filteredSessions.map((session) => (
              <button
                key={session.id}
                className={`list-item ${session.id === currentSessionId ? "list-item-active" : ""}`}
                onClick={() => void selectSession(session.id)}
              >
                <div>
                  <div className="list-title">{session.name}</div>
                  <div className="list-meta">{session.summary}</div>
                </div>
                <div className="list-tail">{formatRelativeTime(session.updatedAt, language)}</div>
              </button>
            ))}

          {!loading && filteredSessions.length === 0 && (
            <div className="empty-state small">
              {pickText(language, {
                "zh-CN": "没有匹配的会话",
                "en-US": "No sessions matched your search"
              })}
            </div>
          )}
        </div>
      </div>

      <div className="module-main">
        {currentSession ? (
          <>
            <div className="section-header">
              <div>
                <div className="section-title">{currentSession.name}</div>
                <div className="section-meta">
                  {pickText(language, {
                    "zh-CN": "支持实时 Gateway 消息、Markdown、引用回复和配置文件附件。",
                    "en-US": "Supports live Gateway messaging, Markdown, quoted replies, and config-file attachments."
                  })}
                </div>
              </div>
              <button className="ghost-button danger" onClick={() => void deleteSession(currentSession.id)}>
                {pickText(language, { "zh-CN": "删除会话", "en-US": "Delete Session" })}
              </button>
            </div>

            <div className="message-list">
              {currentMessages.map((message) => {
                const quoted = getReplyMessage(currentMessages, message.replyTo);

                return (
                  <div key={message.id} className={`message-card message-${message.role}`}>
                    <div className="message-header">
                      <span>
                        {message.role === "assistant"
                          ? "Agent"
                          : pickText(language, { "zh-CN": "你", "en-US": "You" })}
                      </span>
                      <span>{formatTime(message.timestamp, language)}</span>
                    </div>

                    {quoted && (
                      <div className="message-reply-preview">
                        <strong>{pickText(language, { "zh-CN": "引用", "en-US": "Replying to" })}</strong>
                        <span>{quoted.content.slice(0, 120)}</span>
                      </div>
                    )}

                    <div
                      className="message-body"
                      dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(message.content) }}
                    />

                    {!!message.attachments?.length && (
                      <div className="mention-tags">
                        {message.attachments.map((attachmentId) => (
                          <span key={attachmentId} className="badge">
                            {pickText(language, { "zh-CN": "配置附件", "en-US": "Config Ref" })} #{attachmentId.slice(-6)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="message-footer">
                      <span>
                        {message.status === "sending"
                          ? pickText(language, { "zh-CN": "发送中", "en-US": "Sending" })
                          : message.status === "failed"
                            ? pickText(language, { "zh-CN": "发送失败", "en-US": "Failed" })
                            : message.status === "delivered"
                              ? pickText(language, { "zh-CN": "已送达", "en-US": "Delivered" })
                              : pickText(language, { "zh-CN": "已发送", "en-US": "Sent" })}
                      </span>

                      <div className="inline-actions">
                        <button className="link-button" onClick={() => setReplyToId(message.id)}>
                          {pickText(language, { "zh-CN": "引用回复", "en-US": "Reply" })}
                        </button>
                        {message.status === "failed" && (
                          <button className="link-button" onClick={() => void retryMessage(currentSession.id, message.id)}>
                            {pickText(language, { "zh-CN": "重试", "en-US": "Retry" })}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="composer">
              {replyTarget && (
                <div className="reply-banner">
                  <div>
                    <strong>{pickText(language, { "zh-CN": "正在回复", "en-US": "Replying to" })}</strong>
                    <div className="muted">{replyTarget.content.slice(0, 140)}</div>
                  </div>
                  <button className="ghost-button" onClick={() => setReplyToId(null)}>
                    {pickText(language, { "zh-CN": "取消", "en-US": "Cancel" })}
                  </button>
                </div>
              )}

              {!!selectedAttachments.length && (
                <div className="mention-tags">
                  {selectedAttachments.map((file) => (
                    <button
                      key={file.id}
                      className="link-chip"
                      onClick={() =>
                        setSelectedAttachments((current) => current.filter((item) => item.id !== file.id))
                      }
                    >
                      {file.name} · {getConfigLabel(file.name, language)}
                    </button>
                  ))}
                </div>
              )}

              <div className="composer-toolbar">
                <button className="ghost-button" onClick={() => setShowAttachmentPicker((value) => !value)}>
                  {pickText(language, { "zh-CN": "引用配置", "en-US": "Attach Config" })}
                </button>
                <button className="ghost-button" onClick={() => setShowMention((value) => !value)}>
                  {pickText(language, { "zh-CN": "提及 Agent", "en-US": "Mention Agent" })}
                </button>
              </div>

              <textarea
                className="composer-input"
                placeholder={pickText(language, {
                  "zh-CN": "输入消息，Enter 发送，Shift+Enter 换行",
                  "en-US": "Type a message, Enter to send, Shift+Enter for newline"
                })}
                value={currentDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft(currentSession.id, value);
                  setShowMention(value.endsWith("@"));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />

              {showMention && (
                <div className="mention-panel">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      className="mention-item"
                      onClick={() => {
                        const nextDraft = currentDraft.endsWith("@")
                          ? `${currentDraft.slice(0, -1)}[Agent:${agent.id}] `
                          : `${currentDraft}[Agent:${agent.id}] `;
                        setDraft(currentSession.id, nextDraft);
                        setShowMention(false);
                      }}
                    >
                      <span>{agent.icon}</span>
                      <span>{agent.name}</span>
                      <span className="muted">{agent.description}</span>
                    </button>
                  ))}

                  {!agents.length && (
                    <div className="empty-state small">
                      {pickText(language, {
                        "zh-CN": "当前没有可用 Agent",
                        "en-US": "No agents are available right now."
                      })}
                    </div>
                  )}
                </div>
              )}

              {showAttachmentPicker && (
                <div className="mention-panel">
                  {attachmentCandidates.map((file) => {
                    const checked = selectedAttachments.some((item) => item.id === file.id);
                    return (
                      <button
                        key={file.id}
                        className="mention-item"
                        onClick={() => {
                          setSelectedAttachments((current) =>
                            checked ? current.filter((item) => item.id !== file.id) : [...current, file]
                          );
                        }}
                      >
                        <span>{checked ? "OK" : "CF"}</span>
                        <span>{file.name}</span>
                        <span className="muted">{getConfigLabel(file.name, language)}</span>
                      </button>
                    );
                  })}

                  {!attachmentCandidates.length && (
                    <div className="empty-state small">
                      {pickText(language, {
                        "zh-CN": "当前目录下没有可引用的 USER / SOUL / MEMORY 配置文件。",
                        "en-US": "No USER / SOUL / MEMORY config files are available to attach."
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="composer-actions">
                <div className="mention-tags">
                  {selectedMentions.map((mention) => (
                    <span key={mention} className="badge">
                      @{mention}
                    </span>
                  ))}
                </div>
                <button className="primary-button" onClick={handleSend}>
                  {pickText(language, { "zh-CN": "发送", "en-US": "Send" })}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            {pickText(language, {
              "zh-CN": "从左侧选择一个会话，或创建新会话开始对话。",
              "en-US": "Select a session from the left or create a new one to start chatting."
            })}
          </div>
        )}
      </div>
    </div>
  );
}
