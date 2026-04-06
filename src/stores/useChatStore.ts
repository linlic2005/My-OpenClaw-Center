import { create } from 'zustand';
import { ChatSession, Message } from '@/types';
import { apiClient, fetchSSE } from '@/services/api-client';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  currentStreamingText: string;

  // Actions
  fetchSessions: () => Promise<void>;
  setActiveSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createSession: (agentId: string) => Promise<string | null>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isStreaming: false,
  currentStreamingText: '',

  fetchSessions: async () => {
    try {
      const res = await apiClient.get('/chat/sessions');
      const sessions = (res.data.data as ChatSession[]).map((session) => ({
        ...session,
        messages: session.messages || [],
      }));
      set({ sessions });
      if (sessions.length > 0 && !get().activeSessionId) {
        get().setActiveSession(sessions[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id, currentStreamingText: '' });
    // Fetch session messages
    apiClient.get(`/chat/sessions/${id}`).then(res => {
      const session = res.data.data as ChatSession;
      set(state => ({
        sessions: state.sessions.map(s =>
          s.id === id ? { ...s, messages: session.messages || [] } : s
        ),
      }));
    }).catch(console.error);
  },

  sendMessage: async (content) => {
    const { activeSessionId } = get();
    if (!activeSessionId || !content.trim()) return;

    // Add user message optimistically
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMsg], lastMessage: content, updatedAt: userMsg.timestamp }
          : s
      ),
      isStreaming: true,
      currentStreamingText: '',
    }));

    // Stream response via SSE
    try {
      await fetchSSE(
        `/chat/sessions/${activeSessionId}/messages`,
        { content },
        // onChunk
        (data) => {
          set(state => ({ currentStreamingText: state.currentStreamingText + data.content }));
        },
        // onDone
        () => {
          const { currentStreamingText } = get();
          const assistantMsg: Message = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            content: currentStreamingText,
            timestamp: new Date().toISOString(),
          };
          set(state => ({
            sessions: state.sessions.map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, assistantMsg], lastMessage: currentStreamingText, updatedAt: assistantMsg.timestamp }
                : s
            ),
            isStreaming: false,
            currentStreamingText: '',
          }));
        },
        // onError
        (err) => {
          console.error('Stream error:', err);
          set({ isStreaming: false, currentStreamingText: '' });
        },
      );
    } catch (err) {
      console.error('Send message failed:', err);
      set({ isStreaming: false, currentStreamingText: '' });
    }
  },

  createSession: async (agentId) => {
    try {
      const res = await apiClient.post('/chat/sessions', { agentId });
      const newSession: ChatSession = {
        ...res.data.data,
        messages: [],
      };
      set(state => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
      }));
      return newSession.id;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  },
}));
