import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
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
import { NotFoundError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export class MockGatewayAdapter implements GatewayAdapter {
  private connected = false;
  private emitter = new EventEmitter();
  private logInterval: ReturnType<typeof setInterval> | null = null;
  private abortControllers = new Map<string, AbortController>();

  private agents: GatewayAgent[] = [
    {
      id: 'agent-1',
      name: 'Customer Support Agent',
      model: 'gpt-4o',
      status: 'active',
      description: 'Handles general customer inquiries and support tickets.',
      lastActive: new Date().toISOString(),
      roomId: 'public',
    },
    {
      id: 'agent-2',
      name: 'Data Analyst',
      model: 'claude-3-5-sonnet',
      status: 'idle',
      description: 'Specialized in SQL generation and data visualization.',
      lastActive: new Date(Date.now() - 3600000).toISOString(),
      roomId: 'public',
    },
    {
      id: 'agent-3',
      name: 'Software Architect',
      model: 'gpt-4-turbo',
      status: 'offline',
      description: 'Expert in system design and code review.',
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      roomId: 'agent-3-office',
    },
  ];

  private channels: GatewayChannel[] = [
    { id: 'c1', name: 'Global Discord Bot', type: 'discord', status: 'connected' },
    { id: 'c2', name: 'Official Website Chat', type: 'web', status: 'connected' },
    { id: 'c3', name: 'Internal Slack Support', type: 'slack', status: 'disconnected' },
    { id: 'c4', name: 'Marketing Telegram', type: 'telegram', status: 'error' },
  ];

  private tasks: GatewayTask[] = [
    { id: 't1', name: 'Daily Social Media Summary', schedule: '0 9 * * *', agentId: 'agent-1', agentName: 'Social Agent', lastRun: '2024-03-20 09:00', nextRun: '2024-03-21 09:00', status: 'running', type: 'cron' },
    { id: 't2', name: 'Weekly System Health Audit', schedule: '0 0 * * 0', agentId: 'agent-2', agentName: 'Security Auditor', lastRun: '2024-03-17 00:00', nextRun: '2024-03-24 00:00', status: 'paused', type: 'cron' },
    { id: 't3', name: 'Market Data Sync', schedule: '*/30 * * * *', agentId: 'agent-3', agentName: 'Analyst Pro', lastRun: '2024-03-20 14:30', nextRun: '2024-03-20 15:00', status: 'failed', type: 'cron' },
  ];

  private skills: GatewaySkill[] = [
    { id: 's1', name: 'Web Browser', description: 'Allows agents to search and interact with websites in real-time.', version: '2.1.0', category: 'tool', enabled: true, author: 'OpenClaw Team' },
    { id: 's2', name: 'Python Interpreter', description: 'Executes python code snippets for complex calculations and data processing.', version: '1.4.5', category: 'tool', enabled: true, author: 'OpenClaw Team' },
    { id: 's3', name: 'SQL Connect', description: 'Read and write access to structured databases with natural language.', version: '0.9.2', category: 'plugin', enabled: false, author: 'Community' },
    { id: 's4', name: 'Vision Pro', description: 'Image analysis and visual understanding capabilities.', version: '1.0.0', category: 'core', enabled: true, author: 'OpenClaw Team' },
  ];

  async connect(): Promise<void> {
    this.connected = true;
    logger.info('[MockGateway] Connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
    this.emitter.removeAllListeners();
    logger.info('[MockGateway] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ── Agents ──
  async listAgents(): Promise<GatewayAgent[]> {
    return [...this.agents];
  }

  async getAgent(id: string): Promise<GatewayAgent> {
    const agent = this.agents.find(a => a.id === id);
    if (!agent) throw new NotFoundError('agent', id);
    return { ...agent };
  }

  async createAgent(cfg: CreateAgentConfig): Promise<GatewayAgent> {
    const agent: GatewayAgent = {
      id: `agent-${uuidv4().slice(0, 8)}`,
      name: cfg.name,
      model: cfg.model,
      status: 'idle',
      description: cfg.description,
      tags: cfg.tags,
      lastActive: new Date().toISOString(),
      roomId: cfg.roomId || 'public',
    };
    this.agents.push(agent);
    this.emitter.emit('event', { type: 'agent.created', data: agent, timestamp: new Date().toISOString() });
    return agent;
  }

  async updateAgent(id: string, cfg: UpdateAgentConfig): Promise<GatewayAgent> {
    const agent = this.agents.find(a => a.id === id);
    if (!agent) throw new NotFoundError('agent', id);
    Object.assign(agent, cfg);
    this.emitter.emit('event', { type: 'agent.updated', data: agent, timestamp: new Date().toISOString() });
    return { ...agent };
  }

  async deleteAgent(id: string): Promise<void> {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) throw new NotFoundError('agent', id);
    this.agents.splice(idx, 1);
    this.emitter.emit('event', { type: 'agent.deleted', data: { id }, timestamp: new Date().toISOString() });
  }

  async restartAgent(id: string): Promise<void> {
    const agent = this.agents.find(a => a.id === id);
    if (!agent) throw new NotFoundError('agent', id);
    agent.status = 'active';
    agent.lastActive = new Date().toISOString();
    this.emitter.emit('event', { type: 'agent.status_changed', data: { id, status: 'active' }, timestamp: new Date().toISOString() });
  }

  // ── Chat ──
  async *sendMessage(agentId: string, content: string): AsyncGenerator<ChatChunk> {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) throw new NotFoundError('agent', agentId);

    const messageId = uuidv4();
    const ac = new AbortController();
    this.abortControllers.set(messageId, ac);

    const fullMessage = `This is a simulated response from ${agent.name} (${agent.model}) to your message: "${content.slice(0, 50)}". The agent has processed your request and generated this mock reply to demonstrate the streaming capability.`;
    const words = fullMessage.split(' ');

    try {
      for (let i = 0; i < words.length; i++) {
        if (ac.signal.aborted) break;
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        yield {
          content: words[i] + (i < words.length - 1 ? ' ' : ''),
          messageId,
          done: false,
        };
      }

      yield {
        content: '',
        messageId,
        done: true,
        usage: {
          promptTokens: Math.floor(content.length / 4),
          completionTokens: Math.floor(fullMessage.length / 4),
        },
      };
    } finally {
      this.abortControllers.delete(messageId);
    }
  }

  async abortMessage(_agentId: string, messageId: string): Promise<void> {
    const ac = this.abortControllers.get(messageId);
    if (ac) ac.abort();
  }

  // ── Channels ──
  async listChannels(): Promise<GatewayChannel[]> {
    return [...this.channels];
  }

  async createChannel(cfg: CreateChannelConfig): Promise<GatewayChannel> {
    const channel: GatewayChannel = {
      id: `c-${uuidv4().slice(0, 8)}`,
      name: cfg.name,
      type: cfg.type,
      status: cfg.status || 'disconnected',
    };
    this.channels.push(channel);
    return { ...channel };
  }

  async updateChannel(id: string, cfg: UpdateChannelConfig): Promise<GatewayChannel> {
    const channel = this.channels.find(c => c.id === id);
    if (!channel) throw new NotFoundError('channel', id);
    Object.assign(channel, cfg);
    return { ...channel };
  }

  async toggleChannel(id: string, enabled: boolean): Promise<void> {
    const ch = this.channels.find(c => c.id === id);
    if (!ch) throw new NotFoundError('channel', id);
    ch.status = enabled ? 'connected' : 'disconnected';
  }

  async deleteChannel(id: string): Promise<void> {
    const idx = this.channels.findIndex(c => c.id === id);
    if (idx === -1) throw new NotFoundError('channel', id);
    this.channels.splice(idx, 1);
  }

  // ── Tasks ──
  async listTasks(): Promise<GatewayTask[]> {
    return [...this.tasks];
  }

  async createTask(cfg: CreateTaskConfig): Promise<GatewayTask> {
    const task: GatewayTask = {
      id: `t-${uuidv4().slice(0, 8)}`,
      name: cfg.name,
      schedule: cfg.schedule,
      agentId: cfg.agentId,
      agentName: 'Agent',
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 86400000).toISOString(),
      status: 'running',
      type: cfg.type,
    };
    this.tasks.push(task);
    return task;
  }

  async toggleTask(id: string, enabled: boolean): Promise<void> {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new NotFoundError('task', id);
    task.status = enabled ? 'running' : 'paused';
  }

  async deleteTask(id: string): Promise<void> {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new NotFoundError('task', id);
    this.tasks.splice(idx, 1);
  }

  async runTask(id: string): Promise<void> {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new NotFoundError('task', id);
    task.lastRun = new Date().toISOString();
  }

  // ── Skills ──
  async listSkills(): Promise<GatewaySkill[]> {
    return [...this.skills];
  }

  async installSkill(cfg: InstallSkillConfig): Promise<GatewaySkill> {
    const skill: GatewaySkill = {
      id: `s-${uuidv4().slice(0, 8)}`,
      ...cfg,
      enabled: true,
    };
    this.skills.push(skill);
    return skill;
  }

  async toggleSkill(id: string, enabled: boolean): Promise<void> {
    const skill = this.skills.find(s => s.id === id);
    if (!skill) throw new NotFoundError('skill', id);
    skill.enabled = enabled;
  }

  async deleteSkill(id: string): Promise<void> {
    const idx = this.skills.findIndex(s => s.id === id);
    if (idx === -1) throw new NotFoundError('skill', id);
    this.skills.splice(idx, 1);
  }

  // ── System ──
  async getMetrics(): Promise<GatewayMetrics> {
    return {
      cpuUsage: 20 + Math.random() * 15,
      memoryUsage: 35 + Math.random() * 20,
      activeAgents: this.agents.filter(a => a.status === 'active').length,
      totalAgents: this.agents.length,
      totalSessions: 1284 + Math.floor(Math.random() * 100),
      avgLatency: 0.8 + Math.random() * 1.0,
    };
  }

  async getHealth(): Promise<GatewayHealth> {
    return {
      status: 'ok',
      version: '2.4.0',
      uptime: Math.floor(process.uptime()),
    };
  }

  subscribeLogs(callback: (log: GatewayLogEntry) => void): () => void {
    const modules = ['GATEWAY', 'AGENT_RUNNER', 'AUTH', 'CHANNEL_DISCORD', 'DATABASE'];
    const messages = [
      'Incoming request from 192.168.1.45',
      'Agent [Customer Support] successfully initialized',
      'Token validation successful for user admin',
      'Connection heartbeat sent to Discord Gateway',
      'Database query took 124ms',
      'Failed to process message chunk for session s_2841',
      'Garbage collection completed: 42MB freed',
    ];
    const levels: GatewayLogEntry['level'][] = ['info', 'info', 'info', 'warn', 'debug', 'error'];

    this.logInterval = setInterval(() => {
      callback({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        module: modules[Math.floor(Math.random() * modules.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
      });
    }, 2000);

    return () => {
      if (this.logInterval) {
        clearInterval(this.logInterval);
        this.logInterval = null;
      }
    };
  }

  onEvent(handler: (event: GatewayEvent) => void): () => void {
    this.emitter.on('event', handler);
    return () => { this.emitter.off('event', handler); };
  }
}
