import { create } from "zustand";
import { chatService } from "../services/ChatService";
import type { AppLanguage } from "../lib/i18n";
import type { ChatMessage, Session } from "../types";

interface ChatStore {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  drafts: Record<string, string>;
  loading: boolean;
  load: (language?: AppLanguage) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setDraft: (sessionId: string, draft: string) => void;
  sendMessage: (sessionId: string, content: string, mentions?: string[]) => Promise<void>;
  retryMessage: (sessionId: string, messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  drafts: {},
  loading: false,
  async load(language) {
    if (language) chatService.setLanguage(language);
    set({ loading: true });
    const sessions = await chatService.listSessions();
    const currentSessionId = sessions[0]?.id ?? null;
    const messages = currentSessionId
      ? { [currentSessionId]: await chatService.loadHistory(currentSessionId) }
      : {};
    set({ sessions, currentSessionId, messages, loading: false });
  },
  async selectSession(sessionId) {
    const history = await chatService.loadHistory(sessionId);
    set((state) => ({
      currentSessionId: sessionId,
      messages: { ...state.messages, [sessionId]: history }
    }));
  },
  async createSession() {
    const session = await chatService.createSession();
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
      messages: { ...state.messages, [session.id]: [] }
    }));
  },
  async deleteSession(sessionId) {
    await chatService.deleteSession(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((session) => session.id !== sessionId);
      const nextSessionId =
        state.currentSessionId === sessionId ? (sessions[0]?.id ?? null) : state.currentSessionId;
      const messages = { ...state.messages };
      delete messages[sessionId];
      return { sessions, currentSessionId: nextSessionId, messages };
    });
  },
  setDraft(sessionId, draft) {
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: draft } }));
  },
  async sendMessage(sessionId, content, mentions = []) {
    const message = await chatService.sendMessage(sessionId, content, mentions);
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] ?? []), message]
      },
      drafts: { ...state.drafts, [sessionId]: "" }
    }));
    const history = await chatService.loadHistory(sessionId);
    const sessions = await chatService.listSessions();
    set((state) => ({
      messages: { ...state.messages, [sessionId]: history },
      sessions
    }));
  },
  async retryMessage(sessionId, messageId) {
    await chatService.retryMessage(sessionId, messageId);
    const history = await chatService.loadHistory(sessionId);
    set((state) => ({ messages: { ...state.messages, [sessionId]: history } }));
  }
}));
