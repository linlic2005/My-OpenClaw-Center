import { v4 as uuidv4 } from 'uuid';
import { GatewayClient } from './gateway-client.js';
import type { GatewayAdapter } from './gateway-adapter.js';
import type {
  GatewayAgent,
  GatewayChannel,
  GatewayTask,
  GatewaySkill,
  GatewayMetrics,
  GatewayHealth,
  GatewayLogEntry,
  GatewayEvent,
  ChatChunk,
  CreateAgentConfig,
  UpdateAgentConfig,
  CreateChannelConfig,
  UpdateChannelConfig,
  CreateTaskConfig,
  InstallSkillConfig,
} from './gateway.types.js';
import { NotFoundError, GatewayError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

/**
 * HttpGatewayAdapter connects to the real OpenClaw Gateway
 * via its WebSocket RPC protocol (req/res/event frames).
 *
 * Gateway methods are mapped from the protocol schema.
 * Where exact method names are unknown, we use conventional names
 * and the adapter can be adjusted once the full schema.ts is available.
 */
export class HttpGatewayAdapter implements GatewayAdapter {
  private client: GatewayClient;
  private eventHandlers: Array<(event: GatewayEvent) => void> = [];
  private logUnsubscribers: Array<() => void> = [];

  constructor() {
    this.client = new GatewayClient();

    // Bridge gateway events to adapter consumers
    this.client.on('gw:event', (evt: { event: string; payload: unknown }) => {
      const gwEvent: GatewayEvent = {
        type: evt.event,
        data: evt.payload,
        timestamp: new Date().toISOString(),
      };
      for (const handler of this.eventHandlers) {
        handler(gwEvent);
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (err) {
      logger.error(err, '[HttpGatewayAdapter] Failed to connect');
      throw new GatewayError('Failed to connect to Gateway', (err as Error).message);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected;
  }

  // ── Agents ──

  async listAgents(): Promise<GatewayAgent[]> {
    const result = await this.rpc<{ agents: GatewayAgent[] }>('agents.list');
    return result.agents || [];
  }

  async getAgent(id: string): Promise<GatewayAgent> {
    const result = await this.rpc<GatewayAgent>('agents.get', { agentId: id });
    if (!result) throw new NotFoundError('agent', id);
    return result;
  }

  async createAgent(cfg: CreateAgentConfig): Promise<GatewayAgent> {
    return this.rpc<GatewayAgent>('agents.create', cfg);
  }

  async updateAgent(id: string, cfg: UpdateAgentConfig): Promise<GatewayAgent> {
    return this.rpc<GatewayAgent>('agents.update', { agentId: id, ...cfg });
  }

  async deleteAgent(id: string): Promise<void> {
    await this.rpc('agents.delete', { agentId: id });
  }

  async restartAgent(id: string): Promise<void> {
    await this.rpc('agents.restart', { agentId: id });
  }

  // ── Chat ──

  async *sendMessage(
    agentId: string,
    content: string,
    sessionHistory?: Array<{ role: string; content: string }>,
  ): AsyncGenerator<ChatChunk> {
    const messageId = uuidv4();

    // Start a chat stream via gateway
    // The gateway may respond with streaming events or a single response
    // depending on the agent configuration
    try {
      const result = await this.rpc<{ messageId: string; content?: string }>('chat.send', {
        agentId,
        content,
        messageId,
        history: sessionHistory,
        stream: true,
      });

      // If gateway returns a complete response (non-streaming fallback)
      if (result.content) {
        const words = result.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          yield {
            content: words[i] + (i < words.length - 1 ? ' ' : ''),
            messageId,
            done: false,
          };
        }
        yield { content: '', messageId, done: true };
        return;
      }
    } catch {
      // If the RPC approach doesn't work, fall back to event-based streaming
      logger.warn('[HttpGatewayAdapter] chat.send RPC failed, trying event-based streaming');
    }

    // Event-based streaming: listen for chat.chunk events
    yield* this.streamChatEvents(agentId, content, messageId, sessionHistory);
  }

  private async *streamChatEvents(
    agentId: string,
    content: string,
    messageId: string,
    history?: Array<{ role: string; content: string }>,
  ): AsyncGenerator<ChatChunk> {
    // Send the message request
    await this.rpc('chat.stream.start', { agentId, content, messageId, history });

    // Collect chunks via events
    const chunks: ChatChunk[] = [];
    let done = false;

    const chunkHandler = (payload: unknown) => {
      const p = payload as { messageId: string; content: string; done?: boolean; usage?: ChatChunk['usage'] };
      if (p.messageId === messageId) {
        chunks.push({
          content: p.content || '',
          messageId: p.messageId,
          done: !!p.done,
          usage: p.usage,
        });
        if (p.done) done = true;
      }
    };

    this.client.on('gw:chat.chunk', chunkHandler);
    this.client.on('gw:chat.done', chunkHandler);

    try {
      while (!done) {
        while (chunks.length > 0) {
          yield chunks.shift()!;
        }
        await new Promise(r => setTimeout(r, 20));
      }
      // Yield any remaining chunks
      while (chunks.length > 0) {
        yield chunks.shift()!;
      }
    } finally {
      this.client.off('gw:chat.chunk', chunkHandler);
      this.client.off('gw:chat.done', chunkHandler);
    }
  }

  async abortMessage(agentId: string, messageId: string): Promise<void> {
    await this.rpc('chat.abort', { agentId, messageId });
  }

  // ── Channels ──

  async listChannels(): Promise<GatewayChannel[]> {
    const result = await this.rpc<{ channels: GatewayChannel[] }>('channels.list');
    return result.channels || [];
  }

  async createChannel(cfg: CreateChannelConfig): Promise<GatewayChannel> {
    return this.rpc<GatewayChannel>('channels.create', cfg);
  }

  async updateChannel(id: string, cfg: UpdateChannelConfig): Promise<GatewayChannel> {
    return this.rpc<GatewayChannel>('channels.update', { channelId: id, ...cfg });
  }

  async toggleChannel(id: string, enabled: boolean): Promise<void> {
    await this.rpc('channels.toggle', { channelId: id, enabled });
  }

  async deleteChannel(id: string): Promise<void> {
    await this.rpc('channels.delete', { channelId: id });
  }

  // ── Tasks ──

  async listTasks(): Promise<GatewayTask[]> {
    const result = await this.rpc<{ tasks: GatewayTask[] }>('tasks.list');
    return result.tasks || [];
  }

  async createTask(cfg: CreateTaskConfig): Promise<GatewayTask> {
    return this.rpc<GatewayTask>('tasks.create', cfg);
  }

  async toggleTask(id: string, enabled: boolean): Promise<void> {
    await this.rpc('tasks.toggle', { taskId: id, enabled });
  }

  async deleteTask(id: string): Promise<void> {
    await this.rpc('tasks.delete', { taskId: id });
  }

  async runTask(id: string): Promise<void> {
    await this.rpc('tasks.run', { taskId: id });
  }

  // ── Skills ──

  async listSkills(): Promise<GatewaySkill[]> {
    const result = await this.rpc<{ skills: GatewaySkill[] }>('skills.list');
    return result.skills || [];
  }

  async installSkill(cfg: InstallSkillConfig): Promise<GatewaySkill> {
    return this.rpc<GatewaySkill>('skills.install', cfg);
  }

  async toggleSkill(id: string, enabled: boolean): Promise<void> {
    await this.rpc('skills.toggle', { skillId: id, enabled });
  }

  async deleteSkill(id: string): Promise<void> {
    await this.rpc('skills.delete', { skillId: id });
  }

  // ── System ──

  async getMetrics(): Promise<GatewayMetrics> {
    return this.rpc<GatewayMetrics>('system.metrics');
  }

  async getHealth(): Promise<GatewayHealth> {
    return this.rpc<GatewayHealth>('system.health');
  }

  subscribeLogs(callback: (log: GatewayLogEntry) => void): () => void {
    const handler = (payload: unknown) => {
      callback(payload as GatewayLogEntry);
    };
    this.client.on('gw:log.entry', handler);

    // Subscribe to log stream on gateway
    this.rpc('logs.subscribe').catch(() => {
      logger.warn('[HttpGatewayAdapter] logs.subscribe not available');
    });

    const unsub = () => {
      this.client.off('gw:log.entry', handler);
      this.rpc('logs.unsubscribe').catch(() => {});
    };
    this.logUnsubscribers.push(unsub);
    return unsub;
  }

  onEvent(handler: (event: GatewayEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  // ── Helpers ──

  private async rpc<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.client.request<T>(method, params);
    } catch (err) {
      throw new GatewayError(
        `Gateway RPC failed: ${method}`,
        (err as Error).message,
      );
    }
  }
}
