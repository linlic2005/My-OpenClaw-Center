import { getGateway } from '../../gateway/index.js';
import { chatRepository } from './chat.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { SessionDTO, MessageDTO } from './chat.types.js';
import type { ChatChunk } from '../../gateway/gateway.types.js';

export class ChatService {
  createSession(agentId: string, userId: string, title?: string): SessionDTO {
    return chatRepository.createSession(agentId, userId, title || 'New Conversation');
  }

  listSessions(userId: string): SessionDTO[] {
    return chatRepository.listSessions(userId);
  }

  getSession(sessionId: string, userId: string): SessionDTO {
    const session = chatRepository.getSession(sessionId);
    if (!session) throw new NotFoundError('session', sessionId);
    this.assertSessionAccess(session, userId);
    return session;
  }

  deleteSession(sessionId: string, userId: string): void {
    const session = chatRepository.getSession(sessionId);
    if (!session) throw new NotFoundError('session', sessionId);
    this.assertSessionAccess(session, userId);
    chatRepository.deleteSession(sessionId);
  }

  getMessages(sessionId: string, userId: string, page: number, pageSize: number): { messages: MessageDTO[]; total: number } {
    const session = chatRepository.getSession(sessionId);
    if (!session) throw new NotFoundError('session', sessionId);
    this.assertSessionAccess(session, userId);
    const total = chatRepository.countMessages(sessionId);
    const offset = (page - 1) * pageSize;
    const messages = chatRepository.getMessages(sessionId, pageSize, offset);
    return { messages, total };
  }

  async *sendMessage(sessionId: string, content: string, _userId: string): AsyncGenerator<ChatChunk> {
    const session = chatRepository.getSession(sessionId);
    if (!session) throw new NotFoundError('session', sessionId);
    this.assertSessionAccess(session, _userId);

    // Save user message
    chatRepository.addMessage(sessionId, 'user', content);

    // Get session history for context
    const history = chatRepository.getMessages(sessionId, 50).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Stream from gateway
    const gw = getGateway();
    let fullContent = '';

    for await (const chunk of gw.sendMessage(session.agentId, content, history)) {
      if (!chunk.done) {
        fullContent += chunk.content;
      }
      yield chunk;
    }

    // Save assistant message
    if (fullContent) {
      chatRepository.addMessage(sessionId, 'assistant', fullContent, session.agentId);
    }
  }

  async abortMessage(sessionId: string, userId: string, messageId: string): Promise<void> {
    const session = chatRepository.getSession(sessionId);
    if (!session) throw new NotFoundError('session', sessionId);
    this.assertSessionAccess(session, userId);

    const gw = getGateway();
    await gw.abortMessage(session.agentId, messageId);
  }

  private assertSessionAccess(session: SessionDTO, userId: string): void {
    if (session.userId !== userId) {
      throw new ForbiddenError('Session access denied');
    }
  }
}

export const chatService = new ChatService();
