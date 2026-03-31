# OpenClaw Center

基于文档实现的 OpenClaw Windows 远程客户端首版工程，采用 React + TypeScript + Tauri 2 架构。

## 当前已完成

- Chat、Kanban、Files、Studio、Settings 五个模块界面
- Gateway 连接状态、心跳与离线队列的前端模拟
- Zustand 状态层与服务层拆分
- Tauri Rust 最小骨架与示例命令

## 本地开发

1. 安装 Node.js 18+ 与 Rust 1.70+
2. 执行 `npm install`
3. 执行 `npm run dev`
4. 如需桌面模式，执行 `npm run tauri dev`
