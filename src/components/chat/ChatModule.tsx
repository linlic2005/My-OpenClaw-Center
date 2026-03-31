import { useEffect, useMemo, useState } from "react";
import { pickText } from "../../lib/i18n";
import { formatRelativeTime, formatTime, renderMiniMarkdown } from "../../lib/utils";
import { useChatStore } from "../../stores/chatStore";
import { useGatewayStore } from "../../stores/gatewayStore";
import { useSettingsStore } from "../../stores/settingsStore";

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
  const language = useSettingsStore((state) => state.settings.language);
  const [showMention, setShowMention] = useState(false);

  useEffect(() => {
    void load(language);
  }, [language, load]);

  useEffect(() => {
    if (status === "connected" && !agents.length) {
      void refreshAgents();
    }
  }, [agents.length, refreshAgents, status]);

  const currentSession = sessions.find((item) => item.id === currentSessionId) ?? null;
  const currentMessages = currentSessionId ? messages[currentSessionId] ?? [] : [];
  const currentDraft = currentSessionId ? drafts[currentSessionId] ?? "" : "";

  const selectedMentions = useMemo(
    () =>
      agents
        .filter((agent) => currentDraft.includes(`[Agent:${agent.id}]`))
        .map((agent) => agent.id),
    [agents, currentDraft]
  );

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
            sessions.map((session) => (
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
                    "zh-CN": "实时收发 Gateway 消息，支持 Markdown、@Agent 与离线排队。",
                    "en-US": "Live Gateway messaging with Markdown, @Agent mentions, and offline queueing."
                  })}
                </div>
              </div>
              <button className="ghost-button danger" onClick={() => void deleteSession(currentSession.id)}>
                {pickText(language, { "zh-CN": "删除会话", "en-US": "Delete Session" })}
              </button>
            </div>

            <div className="message-list">
              {currentMessages.map((message) => (
                <div key={message.id} className={`message-card message-${message.role}`}>
                  <div className="message-header">
                    <span>
                      {message.role === "assistant"
                        ? "Agent"
                        : pickText(language, { "zh-CN": "你", "en-US": "You" })}
                    </span>
                    <span>{formatTime(message.timestamp, language)}</span>
                  </div>
                  <div
                    className="message-body"
                    dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(message.content) }}
                  />
                  {message.status && (
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
                      {message.status === "failed" && (
                        <button className="link-button" onClick={() => void retryMessage(currentSession.id, message.id)}>
                          {pickText(language, { "zh-CN": "重试", "en-US": "Retry" })}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="composer">
              <textarea
                className="composer-input"
                placeholder={pickText(language, {
                  "zh-CN": "输入消息，Shift+Enter 换行，输入 @ 选择 Agent",
                  "en-US": "Type a message, Shift+Enter for newline, and use @ to mention an agent"
                })}
                value={currentDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft(currentSession.id, value);
                  setShowMention(value.endsWith("@"));
                }}
              />

              {showMention && (
                <div className="mention-panel">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      className="mention-item"
                      onClick={() => {
                        setDraft(currentSession.id, `${currentDraft}[Agent:${agent.id}] `);
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
                        "zh-CN": "暂时没有可用 Agent。",
                        "en-US": "No agents are available right now."
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
                <button
                  className="primary-button"
                  onClick={() =>
                    currentDraft.trim() &&
                    void sendMessage(currentSession.id, currentDraft.trim(), selectedMentions)
                  }
                >
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
