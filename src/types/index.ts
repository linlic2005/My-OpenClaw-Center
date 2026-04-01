export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export type ModuleTab = "chat" | "kanban" | "files" | "studio" | "settings";
export type DeploymentMode = "local" | "remote" | "custom";

export type MessageRole = "user" | "assistant" | "system";

export type MessageState = "sending" | "sent" | "delivered" | "failed";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  installed: boolean;
}

export interface Session {
  id: string;
  name: string;
  summary: string;
  updatedAt: number;
  createdAt?: number;
  agentId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status?: MessageState;
  mentions?: string[];
  replyTo?: string | null;
  attachments?: string[];
}

export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  dueDate?: string;
  assignee?: string;
  labels: KanbanLabel[];
  comments: number;
  syncStatus: "idle" | "syncing" | "error";
  version?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: number;
  language?: string;
  content?: string;
  previewAvailable?: boolean;
}

export interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  speed: string;
  remaining: string;
  status: "running" | "done" | "failed";
}

export interface UploadSession {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
}

export interface DownloadSession {
  downloadId: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
}

export interface DownloadTask {
  id: string;
  fileName: string;
  progress: number;
  status: "running" | "done" | "failed";
}

export interface ErrorLogRecord {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error";
  module: string;
  message: string;
  stack?: string;
  context?: string;
}

export interface ChannelConfig {
  id: string;
  name: string;
  tokenPreview: string;
}

export interface SkillPreference {
  agentId: string;
  installed: boolean;
  enabled: boolean;
}

export interface SettingsState {
  language: "zh-CN" | "en-US";
  deploymentMode: DeploymentMode;
  gatewayUrl: string;
  gatewayAuthToken: string;
  studioUrl: string;
  proxyMode: "none" | "http" | "socks";
  theme: "light" | "dark" | "system";
  accent: string;
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  offlineMode: boolean;
  studioEnabled: boolean;
  channels: ChannelConfig[];
  skillPreferences: SkillPreference[];
}

export interface StudioAgentStatus {
  id: string;
  name: string;
  status: "idle" | "writing" | "researching" | "executing" | "syncing" | "error";
  taskDescription: string;
  lastUpdated: string;
  locale: "CN" | "EN" | "JP";
}

export interface StudioHealth {
  status: string;
  version: string;
  agentCount?: number;
}

export interface GatewayHealth {
  version: string;
  uptime: number;
  activeConnections: number;
  latency: number;
}

export interface GatewayRequest<TPayload = unknown> {
  type: "req";
  id: string;
  method: string;
  params?: TPayload;
}

export interface GatewayResponse<TPayload = unknown> {
  type: "res";
  id: string;
  ok: boolean;
  payload?: TPayload;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface GatewayPushEvent<TPayload = unknown> {
  type: "event";
  event: string;
  payload: TPayload | undefined;
  seq?: number;
  ts?: number;
}

export interface QueuedRequest {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}
