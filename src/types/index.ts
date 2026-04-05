/**
 * Core domain types for OpenClaw Web Console
 */

export type AgentStatus = 'active' | 'idle' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  model: string;
  status: AgentStatus;
  avatar?: string;
  description?: string;
  tags?: string[];
  lastActive?: string;
  config?: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentId?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messages: Message[];
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeAgents: number;
  totalAgents: number;
  totalSessions: number;
  avgLatency: number;
}

export interface Channel {
  id: string;
  type: 'discord' | 'web' | 'slack' | 'telegram';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  timestamp: string;
}
