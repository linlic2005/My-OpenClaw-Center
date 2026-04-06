export type OfficeVisualState = 'idle' | 'writing' | 'syncing' | 'error' | 'offline';

export interface OfficeRuntimePoint {
  x: number;
  y: number;
}

export interface OfficeRuntimeAgent {
  id: string;
  name: string;
  model: string;
  status: string;
  state: OfficeVisualState;
  position: OfficeRuntimePoint;
  isSelected: boolean;
  isStreaming: boolean;
  roleIndex: number;
}

export interface OfficeRuntimePayload {
  agents: OfficeRuntimeAgent[];
  roomName: string;
  roomBackground?: string;
  officeState: Exclude<OfficeVisualState, 'offline'>;
  furniture?: Record<string, number>;
}

export const OFFICE_CANVAS_WIDTH = 1280;
export const OFFICE_CANVAS_HEIGHT = 720;

export const OFFICE_LAYOUT = {
  sofa: { x: 670, y: 144 },
  poster: { x: 252, y: 66 },
  coffeeMachine: { x: 659, y: 397 },
  serverroom: { x: 1021, y: 142 },
  desk: { x: 218, y: 417 },
  flowers: { x: 310, y: 390 },
  cat: { x: 94, y: 557 },
  errorBug: { x: 1007, y: 221 },
  syncAnim: { x: 1157, y: 592 },
  starIdle: { x: 642, y: 282 },
  starWorking: { x: 217, y: 333 },
  plaque: { x: 640, y: 684 },
} as const;

export const OFFICE_ASSET_PATHS = {
  phaserVendor: '/vendor/phaser-3.80.1.min.js',
  font: '/assets/star-office/fonts/ark-pixel-12px-proportional-zh_cn.ttf.woff2',
  roomBackground: '/assets/star-office/office_bg_small.webp',
  sofaIdle: '/assets/star-office/sofa-idle-v3.png',
  coffeeMachine: '/assets/star-office/coffee-machine-v3-grid.webp',
  serverroom: '/assets/star-office/serverroom-spritesheet.webp',
  errorBug: '/assets/star-office/error-bug-spritesheet-grid.webp',
  cats: '/assets/star-office/cats-spritesheet.webp',
  desk: '/assets/star-office/desk-v3.webp',
  plants: '/assets/star-office/plants-spritesheet.webp',
  posters: '/assets/star-office/posters-spritesheet.webp',
  starWorking: '/assets/star-office/star-working-spritesheet-grid.webp',
  syncAnim: '/assets/star-office/sync-animation-v3-grid.webp',
  starIdle: '/assets/star-office/star-idle-v5.png',
  robotIdle: '/assets/agents/robot-idle.webp',
  robotWorking: '/assets/agents/robot-working.webp',
  robotSleeping: '/assets/agents/robot-sleeping.webp',
} as const;

export const OFFICE_STATE_LABELS: Record<OfficeVisualState, string> = {
  idle: '待命',
  writing: '工作中',
  syncing: '流式同步',
  error: '错误',
  offline: '离线',
};

export const OFFICE_STATE_BUBBLES: Record<OfficeVisualState, string[]> = {
  idle: [
    '等待新任务',
    '办公室安静运行中',
    '状态稳定，随时可调度',
  ],
  writing: [
    '正在处理任务',
    '执行链路已进入工作区',
    '上下文正在整理中',
  ],
  syncing: [
    '回复正在流式输出',
    '会话同步中',
    '实时状态已推送',
  ],
  error: [
    '检测到异常，需要关注',
    '错误已进入隔离区',
    '请检查日志与状态面板',
  ],
  offline: [
    '当前离线',
    '等待重新连接',
    '需要恢复在线状态',
  ],
};
