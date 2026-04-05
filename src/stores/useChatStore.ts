import { create } from 'zustand';
import { ChatSession, Message } from '@/types';
import { MOCK_SESSIONS, generateMockStream } from '@/services/mock/data';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  currentStreamingText: string;
  
  // Actions
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  sendMessage: (content: string) => Promise<void>;
  createSession: (agentId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: MOCK_SESSIONS,
  activeSessionId: MOCK_SESSIONS[0].id,
  isStreaming: false,
  currentStreamingText: '',

  setActiveSession: (id) => set({ activeSessionId: id, currentStreamingText: '' }),

  addMessage: (sessionId, message) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      sessions: state.sessions.map((s) => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, newMessage], lastMessage: newMessage.content, updatedAt: newMessage.timestamp }
          : s
      )
    }));
  },

  sendMessage: async (content) => {
    const { activeSessionId, addMessage } = get();
    if (!activeSessionId || !content.trim()) return;

    // 1. Add user message
    addMessage(activeSessionId, {
      role: 'user',
      content,
    });

    // 2. Start simulated streaming
    set({ isStreaming: true, currentStreamingText: '' });

    await generateMockStream(
      (chunk) => {
        set((state) => ({ currentStreamingText: state.currentStreamingText + chunk }));
      },
      () => {
        const { currentStreamingText } = get();
        // Finalize the message into the session
        addMessage(activeSessionId, {
          role: 'assistant',
          content: currentStreamingText,
        });
        set({ isStreaming: false, currentStreamingText: '' });
      }
    );
  },

  createSession: (agentId) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      agentId,
      title: 'New Conversation',
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: newSession.id,
    }));
  },
}));
