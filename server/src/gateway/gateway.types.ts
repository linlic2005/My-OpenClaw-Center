// Gateway 原始协议类型
// 这些类型表示 Gateway 返回的原始数据格式
// 不允许泄露到业务层 — 在 adapter 内部完成转换

export type GatewayAgentStatus = 'active' | 'idle' | 'error' | 'offline';

export interface GatewayAgent {
  id: string;
  name: string;
  model: string;
  status: GatewayAgentStatus;
  avatar?: string;
  description?: string;
  tags?: string[];
  lastActive?: string;
  config?: Record<string, unknown>;
  roomId?: string;
}

export interface GatewayChannel {
  id: string;
  type: 'discord' | 'web' | 'slack' | 'telegram';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, unknown>;
}

export interface GatewayTask {
  id: string;
  name: string;
  schedule: string;
  agentId: string;
  agentName: string;
  lastRun: string;
  nextRun: string;
  status: 'running' | 'paused' | 'failed';
  type: 'cron' | 'once';
}

export interface GatewaySkill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'core' | 'tool' | 'plugin';
  enabled: boolean;
  author: string;
}

export interface GatewayMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeAgents: number;
  totalAgents: number;
  totalSessions: number;
  avgLatency: number;
}

export interface GatewayHealth {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
}

export interface GatewayLogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  timestamp: string;
}

export interface ChatChunk {
  content: string;
  messageId: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface CreateAgentConfig extends Record<string, unknown> {
  name: string;
  model: string;
  description?: string;
  tags?: string[];
  roomId?: string;
}

export interface UpdateAgentConfig extends Record<string, unknown> {
  name?: string;
  model?: string;
  description?: string;
  tags?: string[];
  roomId?: string;
}

export interface CreateChannelConfig extends Record<string, unknown> {
  name: string;
  type: 'discord' | 'web' | 'slack' | 'telegram';
  status?: 'connected' | 'disconnected' | 'error';
}

export interface UpdateChannelConfig extends Record<string, unknown> {
  name?: string;
  type?: 'discord' | 'web' | 'slack' | 'telegram';
  status?: 'connected' | 'disconnected' | 'error';
}

export interface CreateTaskConfig extends Record<string, unknown> {
  name: string;
  schedule: string;
  agentId: string;
  type: 'cron' | 'once';
}

export interface InstallSkillConfig extends Record<string, unknown> {
  name: string;
  description: string;
  version: string;
  category: 'core' | 'tool' | 'plugin';
  author: string;
}

export interface GatewayEvent {
  type: string;
  data: unknown;
  timestamp: string;
}
