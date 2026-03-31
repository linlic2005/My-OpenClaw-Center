import type {
  AgentProfile,
  ChatMessage,
  FileItem,
  KanbanCard,
  KanbanColumn,
  Session,
  SettingsState,
  StudioAgentStatus
} from "../types";
import type { AppLanguage } from "../lib/i18n";

const baseTime = Date.now();

export function getMockAgents(language: AppLanguage): AgentProfile[] {
  return [
    {
      id: "agent_coding",
      name: "Coding Agent",
      description:
        language === "zh-CN" ? "代码开发和调试助手" : "Code development and debugging assistant",
      icon: "💻",
      enabled: true,
      installed: true
    },
    {
      id: "agent_research",
      name: "Research Agent",
      description:
        language === "zh-CN" ? "信息检索和分析助手" : "Research and analysis assistant",
      icon: "🔎",
      enabled: true,
      installed: true
    },
    {
      id: "agent_writing",
      name: "Writing Agent",
      description:
        language === "zh-CN" ? "写作和内容创作助手" : "Writing and content creation assistant",
      icon: "✍️",
      enabled: false,
      installed: true
    },
    {
      id: "agent_design",
      name: "Design Agent",
      description:
        language === "zh-CN" ? "UI / UX 设计助手" : "UI / UX design assistant",
      icon: "🎨",
      enabled: false,
      installed: false
    }
  ];
}

export function getMockSessions(language: AppLanguage): Session[] {
  return [
    {
      id: "sess_project",
      name: language === "zh-CN" ? "项目讨论" : "Project Discussion",
      summary:
        language === "zh-CN"
          ? "梳理 OpenClaw 客户端需求"
          : "Reviewing the OpenClaw client scope",
      updatedAt: baseTime - 1000 * 60 * 5
    },
    {
      id: "sess_review",
      name: language === "zh-CN" ? "代码审查" : "Code Review",
      summary:
        language === "zh-CN"
          ? "检查登录逻辑和文件上传链路"
          : "Inspecting auth flow and file upload pipeline",
      updatedAt: baseTime - 1000 * 60 * 55
    },
    {
      id: "sess_ops",
      name: language === "zh-CN" ? "运维同步" : "Ops Sync",
      summary:
        language === "zh-CN"
          ? "确认 Gateway 连通性与健康状态"
          : "Checking gateway reachability and health",
      updatedAt: baseTime - 1000 * 60 * 130
    }
  ];
}

export function getMockMessages(language: AppLanguage): Record<string, ChatMessage[]> {
  return {
    sess_project: [
      {
        id: "msg_1",
        sessionId: "sess_project",
        role: "user",
        content:
          language === "zh-CN"
            ? "你好，请帮我梳理一下这个客户端的实现重点。"
            : "Hi, please help me outline the main implementation priorities for this client.",
        timestamp: baseTime - 1000 * 60 * 6,
        status: "sent"
      },
      {
        id: "msg_2",
        sessionId: "sess_project",
        role: "assistant",
        content:
          language === "zh-CN"
            ? "## 首批落地建议\n- 先打通 Gateway 连接、会话加载、看板同步和文件列表。\n- 本地缓存优先保存草稿、设置和离线队列。"
            : "## First delivery suggestions\n- Start with gateway connectivity, sessions, board sync, and file listing.\n- Prioritize drafts, settings, and offline queue in local persistence.",
        timestamp: baseTime - 1000 * 60 * 5,
        status: "sent"
      }
    ],
    sess_review: [
      {
        id: "msg_3",
        sessionId: "sess_review",
        role: "user",
        content:
          language === "zh-CN"
            ? "请重点看看文件上传的重试策略。"
            : "Please focus on the retry strategy for file uploads.",
        timestamp: baseTime - 1000 * 60 * 56,
        status: "sent"
      }
    ],
    sess_ops: []
  };
}

export function getMockColumns(language: AppLanguage): KanbanColumn[] {
  return [
    { id: "todo", title: language === "zh-CN" ? "待办" : "To Do", color: "#7c8aa5", order: 0 },
    {
      id: "doing",
      title: language === "zh-CN" ? "进行中" : "In Progress",
      color: "#3182ce",
      order: 1
    },
    {
      id: "done",
      title: language === "zh-CN" ? "已完成" : "Done",
      color: "#2f855a",
      order: 2
    }
  ];
}

export function getMockCards(language: AppLanguage): KanbanCard[] {
  return [
    {
      id: "card_shell",
      columnId: "todo",
      title:
        language === "zh-CN" ? "搭建 Tauri 项目骨架" : "Build the Tauri project foundation",
      description:
        language === "zh-CN"
          ? "初始化前端目录、服务层、状态层和 Rust 命令。"
          : "Initialize frontend folders, services, stores, and Rust commands.",
      order: 0,
      labels: [
        {
          id: "urgent",
          name: language === "zh-CN" ? "核心" : "Core",
          color: "#c53030"
        }
      ],
      comments: 2,
      syncStatus: "idle",
      dueDate: "2026-04-02"
    },
    {
      id: "card_chat",
      columnId: "doing",
      title: language === "zh-CN" ? "实现聊天模块" : "Implement the chat module",
      description:
        language === "zh-CN"
          ? "会话列表、草稿保存、消息状态和 @Agent 提及。"
          : "Session list, draft persistence, message states, and @Agent mentions.",
      order: 0,
      labels: [
        {
          id: "chat",
          name: "Chat",
          color: "#2b6cb0"
        }
      ],
      comments: 4,
      syncStatus: "syncing",
      assignee: "Coding Agent"
    },
    {
      id: "card_files",
      columnId: "done",
      title:
        language === "zh-CN" ? "定义文件 API 协议" : "Define the file API contract",
      description:
        language === "zh-CN"
          ? "分片上传、下载初始化和目录列举协议已整理。"
          : "Chunked upload, download init, and directory listing contracts are drafted.",
      order: 0,
      labels: [
        {
          id: "api",
          name: "API",
          color: "#2f855a"
        }
      ],
      comments: 1,
      syncStatus: "idle"
    }
  ];
}

export function getMockFiles(language: AppLanguage): FileItem[] {
  return [
    {
      id: "dir_src",
      name: "src",
      path: "/project/src",
      type: "directory",
      size: 0,
      modifiedAt: baseTime - 1000 * 60 * 80
    },
    {
      id: "file_readme",
      name: "README.md",
      path: "/project/README.md",
      type: "file",
      size: 1250,
      modifiedAt: baseTime - 1000 * 60 * 60,
      language: "markdown",
      content:
        language === "zh-CN"
          ? "# OpenClaw Center\n\n一个基于 React + Tauri 的远程桌面客户端。"
          : "# OpenClaw Center\n\nA remote desktop client built with React and Tauri."
    },
    {
      id: "file_app",
      name: "App.tsx",
      path: "/project/src/App.tsx",
      type: "file",
      size: 4620,
      modifiedAt: baseTime - 1000 * 60 * 12,
      language: "typescript",
      content:
        language === "zh-CN"
          ? "export default function App() {\n  return <div>OpenClaw Center 应用入口</div>;\n}"
          : "export default function App() {\n  return <div>OpenClaw Center application entry</div>;\n}"
    },
    {
      id: "file_style",
      name: "index.css",
      path: "/project/src/index.css",
      type: "file",
      size: 3310,
      modifiedAt: baseTime - 1000 * 60 * 20,
      language: "css",
      content: ":root {\n  color-scheme: dark;\n}"
    }
  ];
}

export function getMockStudioAgents(language: AppLanguage): StudioAgentStatus[] {
  return [
    {
      id: "taizibot",
      name: "TaiziBot",
      status: "executing",
      taskDescription:
        language === "zh-CN"
          ? "正在同步聊天模块消息状态"
          : "Syncing message states for the chat module",
      lastUpdated: "2026-03-31T18:48:00Z",
      locale: language === "zh-CN" ? "CN" : "EN"
    },
    {
      id: "researchbot",
      name: "ResearchBot",
      status: "researching",
      taskDescription:
        language === "zh-CN"
          ? "整理 Gateway API 响应格式"
          : "Organizing Gateway API response formats",
      lastUpdated: "2026-03-31T18:47:32Z",
      locale: "EN"
    },
    {
      id: "writerbot",
      name: "WriterBot",
      status: "idle",
      taskDescription:
        language === "zh-CN" ? "等待分配新任务" : "Waiting for a new assignment",
      lastUpdated: "2026-03-31T18:40:12Z",
      locale: language === "zh-CN" ? "CN" : "EN"
    }
  ];
}

export const defaultSettings: SettingsState = {
  language: "zh-CN",
  gatewayUrl: "ws://192.168.123.115:18789",
  proxyMode: "none",
  theme: "system",
  accent: "#2563eb",
  fontSize: "medium",
  compactMode: false,
  notifications: true,
  soundEnabled: true,
  offlineMode: true,
  studioEnabled: true,
  channels: [
    { id: "channel_main", name: "Main Channel", tokenPreview: "tok_****f92d" },
    { id: "channel_test", name: "Test Channel", tokenPreview: "tok_****a18c" }
  ],
  skillPreferences: []
};
