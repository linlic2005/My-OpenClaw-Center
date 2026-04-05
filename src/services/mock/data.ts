import { Agent, ChatSession, SystemMetrics } from '@/types';

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Customer Support Agent',
    model: 'gpt-4o',
    status: 'active',
    description: 'Handles general customer inquiries and support tickets.',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'agent-2',
    name: 'Data Analyst',
    model: 'claude-3-5-sonnet',
    status: 'idle',
    description: 'Specialized in SQL generation and data visualization.',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'agent-3',
    name: 'Software Architect',
    model: 'gpt-4-turbo',
    status: 'offline',
    description: 'Expert in system design and code review.',
    lastActive: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_METRICS: SystemMetrics = {
  cpuUsage: 24,
  memoryUsage: 42,
  activeAgents: 4,
  totalAgents: 12,
  totalSessions: 1284,
  avgLatency: 1.2,
};

export const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 'session-1',
    agentId: 'agent-1',
    title: 'Order Status Inquiry',
    lastMessage: 'I am checking the status of order #12345 for you now.',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Can you check the status of order #12345?',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'I am checking the status of order #12345 for you now.',
        timestamp: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'session-2',
    agentId: 'agent-2',
    title: 'Monthly Revenue Analysis',
    lastMessage: 'The chart shows a 15% increase compared to last month.',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messages: []
  }
];

export const generateMockStream = async (
  onChunk: (chunk: string) => void, 
  onComplete: () => void
) => {
  const fullMessage = "This is a simulated streaming response from the OpenClaw Gateway. It demonstrates how chunks are received and rendered in real-time as the model generates content. Markdown elements like **bold text**, `code snippets`, and lists are also supported.";
  const words = fullMessage.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    onChunk(words[i] + ' ');
  }
  
  onComplete();
};
