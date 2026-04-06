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

export interface GatewayAdapter {
  // Connection lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Agents
  listAgents(): Promise<GatewayAgent[]>;
  getAgent(id: string): Promise<GatewayAgent>;
  createAgent(config: CreateAgentConfig): Promise<GatewayAgent>;
  updateAgent(id: string, config: UpdateAgentConfig): Promise<GatewayAgent>;
  deleteAgent(id: string): Promise<void>;
  restartAgent(id: string): Promise<void>;

  // Chat
  sendMessage(agentId: string, content: string, sessionHistory?: Array<{ role: string; content: string }>): AsyncGenerator<ChatChunk>;
  abortMessage(agentId: string, messageId: string): Promise<void>;

  // Channels
  listChannels(): Promise<GatewayChannel[]>;
  createChannel(config: CreateChannelConfig): Promise<GatewayChannel>;
  updateChannel(id: string, config: UpdateChannelConfig): Promise<GatewayChannel>;
  toggleChannel(id: string, enabled: boolean): Promise<void>;
  deleteChannel(id: string): Promise<void>;

  // Tasks
  listTasks(): Promise<GatewayTask[]>;
  createTask(task: CreateTaskConfig): Promise<GatewayTask>;
  toggleTask(id: string, enabled: boolean): Promise<void>;
  deleteTask(id: string): Promise<void>;
  runTask(id: string): Promise<void>;

  // Skills
  listSkills(): Promise<GatewaySkill[]>;
  installSkill(config: InstallSkillConfig): Promise<GatewaySkill>;
  toggleSkill(id: string, enabled: boolean): Promise<void>;
  deleteSkill(id: string): Promise<void>;

  // System
  getMetrics(): Promise<GatewayMetrics>;
  getHealth(): Promise<GatewayHealth>;
  subscribeLogs(callback: (log: GatewayLogEntry) => void): () => void;

  // Events
  onEvent(handler: (event: GatewayEvent) => void): () => void;
}
