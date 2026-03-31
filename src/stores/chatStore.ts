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
  initialized: boolean;
  load: (language?: AppLanguage) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setDraft: (sessionId: string, draft: string) => void;
  sendMessage: (sessionId: string, content: string, mentions?: string[]) => Promise<void>;
  retryMessage: (sessionId: string, messageId: string) => Promise<void>;
}

let chatUnsubscribe: (() => void) | null = null;

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  drafts: {},
  loading: false,
  initialized: false,
  async load(language) {
    if (language) chatService.setLanguage(language);

    if (!get().initialized) {
      chatUnsubscribe?.();
      chatUnsubscribe = chatService.subscribe((snapshot) => {
        set((state) => {
          const currentSessionId =
            state.currentSessionId && snapshot.sessions.some((session) => session.id === state.currentSessionId)
              ? state.currentSessionId
              : snapshot.sessions[0]?.id ?? null;

          return {
            sessions: snapshot.sessions,
            messages: snapshot.messages,
            currentSessionId
          };
        });
      });
      set({ initialized: true });
    }

    set({ loading: true });
    await chatService.bootstrap();

    const currentSessionId = get().currentSessionId ?? get().sessions[0]?.id ?? null;
    if (currentSessionId) {
      await chatService.ensureHistoryLoaded(currentSessionId);
      set({ currentSessionId });
    }

    set({ loading: false });
  },
  async selectSession(sessionId) {
    set({ currentSessionId: sessionId, loading: true });
    await chatService.ensureHistoryLoaded(sessionId);
    set({ loading: false });
  },
  async createSession() {
    const session = await chatService.createSession();
    set((state) => ({
      currentSessionId: session.id,
      drafts: { ...state.drafts, [session.id]: "" }
    }));
  },
  async deleteSession(sessionId) {
    await chatService.deleteSession(sessionId);
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[sessionId];
      return { drafts };
    });
  },
  setDraft(sessionId, draft) {
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: draft } }));
  },
  async sendMessage(sessionId, content, mentions = []) {
    await chatService.sendMessage(sessionId, content, mentions);
    set((state) => ({
      drafts: { ...state.drafts, [sessionId]: "" }
    }));
  },
  async retryMessage(sessionId, messageId) {
    await chatService.retryMessage(sessionId, messageId);
  }
}));
