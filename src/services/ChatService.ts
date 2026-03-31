import { getMockMessages, getMockSessions } from "../data/mock";
import type { AppLanguage } from "../lib/i18n";
import { createId, sleep } from "../lib/utils";
import { gatewayService } from "./GatewayService";
import type { ChatMessage, Session } from "../types";

class ChatService {
  private language: AppLanguage = "zh-CN";
  private sessions: Session[] = [];
  private messages: Record<string, ChatMessage[]> = {};

  constructor() {
    this.reset();
  }

  setLanguage(language: AppLanguage): void {
    if (this.language === language) return;
    this.language = language;
    this.reset();
  }

  private reset(): void {
    this.sessions = getMockSessions(this.language);
    this.messages = getMockMessages(this.language);
  }

  async listSessions(): Promise<Session[]> {
    await sleep(220);
    return [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createSession(name?: string): Promise<Session> {
    const session: Session = {
      id: createId("sess"),
      name: name?.trim() || (this.language === "zh-CN" ? "新会话" : "New Session"),
      summary: this.language === "zh-CN" ? "等待第一条消息" : "Waiting for the first message",
      updatedAt: Date.now()
    };
    this.sessions.unshift(session);
    this.messages[session.id] = [];
    await gatewayService.send("chat.create_session", { name: session.name });
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions = this.sessions.filter((session) => session.id !== sessionId);
    delete this.messages[sessionId];
    await gatewayService.send("chat.delete_session", { sessionId });
  }

  async loadHistory(sessionId: string): Promise<ChatMessage[]> {
    await sleep(260);
    return [...(this.messages[sessionId] ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  }

  async sendMessage(sessionId: string, content: string, mentions: string[] = []): Promise<ChatMessage> {
    const optimistic: ChatMessage = {
      id: createId("msg"),
      sessionId,
      role: "user",
      content,
      mentions,
      timestamp: Date.now(),
      status: "sending"
    };
    this.messages[sessionId] = [...(this.messages[sessionId] ?? []), optimistic];
    await gatewayService.send("chat.send_message", { sessionId, content, mentions });
    await sleep(320);
    optimistic.status = "sent";
    this.bumpSession(sessionId, content);
    void this.pushAssistantReply(sessionId, content);
    return optimistic;
  }

  async retryMessage(sessionId: string, messageId: string): Promise<void> {
    const item = (this.messages[sessionId] ?? []).find((message) => message.id === messageId);
    if (!item) return;
    item.status = "sending";
    await gatewayService.send("chat.send_message", {
      sessionId,
      content: item.content,
      mentions: item.mentions
    });
    item.status = "sent";
  }

  private async pushAssistantReply(sessionId: string, content: string): Promise<void> {
    await sleep(900);
    const reply: ChatMessage = {
      id: createId("msg"),
      sessionId,
      role: "assistant",
      content:
        this.language === "zh-CN"
          ? `已收到：${content}\n\n我会继续根据 Gateway 协议和本地状态给出下一步建议。`
          : `Received: ${content}\n\nI will continue with the next suggestions based on the Gateway protocol and local state.`,
      timestamp: Date.now(),
      status: "sent"
    };
    this.messages[sessionId] = [...(this.messages[sessionId] ?? []), reply];
    this.bumpSession(sessionId, reply.content);
  }

  private bumpSession(sessionId: string, summary: string): void {
    this.sessions = this.sessions.map((session) =>
      session.id === sessionId
        ? { ...session, updatedAt: Date.now(), summary: summary.slice(0, 32) }
        : session
    );
  }
}

export const chatService = new ChatService();
