import type { AppLanguage } from "../lib/i18n";
import { createId } from "../lib/utils";
import { gatewayService } from "./GatewayService";
import type { ChatMessage, MessageState, Session } from "../types";

interface ChatSnapshot {
  sessions: Session[];
  messages: Record<string, ChatMessage[]>;
}

type ChatListener = (snapshot: ChatSnapshot) => void;

const SESSION_STORAGE_KEY = "openclaw.chat.sessions";

function cloneMessages(messages: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  return Object.fromEntries(
    Object.entries(messages).map(([sessionId, items]) => [sessionId, [...items]])
  );
}

function normalizeSessionName(name: unknown, language: AppLanguage): string {
  if (typeof name === "string" && name.trim()) return name;
  return language === "zh-CN" ? "新会话" : "New Session";
}

function createSessionSummary(content: string, language: AppLanguage): string {
  const stripped = content.replace(/\s+/g, " ").trim();
  if (stripped) return stripped.slice(0, 48);
  return language === "zh-CN" ? "等待第一条消息" : "Waiting for the first message";
}

function normalizeMessage(
  raw: Record<string, unknown>,
  sessionId: string,
  fallbackStatus: MessageState = "sent"
): ChatMessage {
  return {
    id: String(raw.id ?? createId("msg")),
    sessionId,
    role: (raw.role as ChatMessage["role"]) ?? "assistant",
    content: String(raw.content ?? ""),
    timestamp: Number(raw.timestamp ?? Date.now()),
    status: (raw.status as MessageState) ?? fallbackStatus,
    mentions: Array.isArray(raw.mentions) ? raw.mentions.map(String) : [],
    replyTo: raw.replyTo ? String(raw.replyTo) : null
  };
}

class ChatService {
  private language: AppLanguage = "zh-CN";
  private sessions: Session[] = [];
  private messages: Record<string, ChatMessage[]> = {};
  private listeners = new Set<ChatListener>();

  constructor() {
    this.sessions = this.loadSessions();
    this.bindGatewayEvents();
  }

  subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  getSnapshot(): ChatSnapshot {
    return {
      sessions: [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt),
      messages: cloneMessages(this.messages)
    };
  }

  async bootstrap(): Promise<void> {
    this.emit();
  }

  async ensureHistoryLoaded(sessionId: string): Promise<ChatMessage[]> {
    const payload = await gatewayService.send<{ messages?: Array<Record<string, unknown>> }>(
      "chat.load_history",
      { sessionId, limit: 50 }
    );

    this.messages[sessionId] = Array.isArray(payload.messages)
      ? payload.messages.map((message) => normalizeMessage(message, sessionId))
      : [];

    this.emit();
    return [...this.messages[sessionId]];
  }

  async createSession(name?: string): Promise<Session> {
    const payload = await gatewayService.send<Record<string, unknown>>("chat.create_session", {
      ...(name?.trim() ? { name: name.trim() } : {})
    });

    const createdAt = Number(payload.createdAt ?? Date.now());
    const session: Session = {
      id: String(payload.sessionId ?? createId("sess")),
      name: normalizeSessionName(payload.name ?? name, this.language),
      summary: this.language === "zh-CN" ? "等待第一条消息" : "Waiting for the first message",
      createdAt,
      updatedAt: createdAt
    };

    this.upsertSession(session);
    this.messages[session.id] = [];
    this.saveSessions();
    this.emit();

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await gatewayService.send("chat.delete_session", { sessionId });
    this.sessions = this.sessions.filter((session) => session.id !== sessionId);
    delete this.messages[sessionId];
    this.saveSessions();
    this.emit();
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
    this.touchSession(sessionId, content);
    this.emit();

    void this.commitOutgoingMessage(optimistic);
    return optimistic;
  }

  async retryMessage(sessionId: string, messageId: string): Promise<void> {
    const message = (this.messages[sessionId] ?? []).find((item) => item.id === messageId);
    if (!message) return;

    this.updateMessage(sessionId, messageId, { status: "sending", timestamp: Date.now() });
    this.emit();
    void this.commitOutgoingMessage(message);
  }

  private async commitOutgoingMessage(message: ChatMessage): Promise<void> {
    try {
      const payload = await gatewayService.send<Record<string, unknown>>("chat.send_message", {
        sessionId: message.sessionId,
        content: message.content,
        mentions: message.mentions ?? [],
        ...(message.replyTo ? { replyTo: message.replyTo } : {})
      });

      const nextId = String(payload.messageId ?? message.id);
      const status = String(payload.status ?? "sent") as MessageState;
      this.updateMessage(message.sessionId, message.id, {
        id: nextId,
        status,
        timestamp: Number(payload.sentAt ?? message.timestamp)
      });
      this.touchSession(message.sessionId, message.content);
      this.emit();
    } catch {
      this.updateMessage(message.sessionId, message.id, { status: "failed" });
      this.emit();
    }
  }

  private bindGatewayEvents(): void {
    gatewayService.on<{ sessionId?: unknown; message?: Record<string, unknown> }>(
      "chat.new_message",
      ({ payload }) => {
        const sessionId = String(payload.sessionId ?? "");
        if (!sessionId || !payload.message) return;

        const nextMessage = normalizeMessage(payload.message, sessionId);
        const existing = this.messages[sessionId] ?? [];
        if (existing.some((item) => item.id === nextMessage.id)) return;

        this.messages[sessionId] = [...existing, nextMessage].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        this.touchSession(sessionId, nextMessage.content);
        this.emit();
      }
    );

    gatewayService.on<{
      sessionId?: unknown;
      messageId?: unknown;
      updates?: Record<string, unknown>;
    }>("chat.message_updated", ({ payload }) => {
      const sessionId = String(payload.sessionId ?? "");
      const messageId = String(payload.messageId ?? "");
      if (!sessionId || !messageId || !payload.updates) return;

      this.updateMessage(sessionId, messageId, {
        ...(payload.updates.status ? { status: String(payload.updates.status) as MessageState } : {})
      });
      this.emit();
    });
  }

  private updateMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): void {
    this.messages[sessionId] = (this.messages[sessionId] ?? []).map((message) =>
      message.id === messageId ? { ...message, ...updates } : message
    );
  }

  private upsertSession(session: Session): void {
    const next = this.sessions.filter((item) => item.id !== session.id);
    next.unshift(session);
    this.sessions = next.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private touchSession(sessionId: string, summarySource: string): void {
    const now = Date.now();
    const current = this.sessions.find((session) => session.id === sessionId);
    const next: Session = current
      ? {
          ...current,
          summary: createSessionSummary(summarySource, this.language),
          updatedAt: now
        }
      : {
          id: sessionId,
          name: this.language === "zh-CN" ? "远程会话" : "Remote Session",
          summary: createSessionSummary(summarySource, this.language),
          updatedAt: now,
          createdAt: now
        };

    this.upsertSession(next);
    this.saveSessions();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private loadSessions(): Session[] {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Session[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveSessions(): void {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.sessions));
  }
}

export const chatService = new ChatService();
