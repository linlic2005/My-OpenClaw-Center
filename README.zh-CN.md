# OpenClaw Center

OpenClaw Center 是一个可发布到 GitHub 的 OpenClaw 客户端，技术栈为 React、TypeScript 与 Tauri 2。

这次重构后的目标很明确：

- 用 `ClawX` 风格重做主界面和产品壳层
- 融合 `Star-Office-UI` 风格的工作室场景可视化
- 保留并强化现有 OpenClaw Gateway 真连接能力

最终效果是：项目既能像官方 WebUI 一样连接本地或远端 OpenClaw Gateway、读取 Agent 信息，又具备更完整的主控台与工作室体验。

## 当前亮点

- 官方式 Gateway 握手
  已接入 `connect.challenge` + `connect`、共享 Token、配对设备 Token、心跳与重连。
- Agent 中心化首页
  新首页会统一展示 Gateway 状态、Agent 名册、部署模式、离线队列和工作室态势。
- Star Office 工作室场景
  `Studio` 页面可以优先嵌入 Flask 工作室页面；不可用时，自动回退到内置 Star Office 风格场景视图。
- 保留原有功能模块
  `Chat`、`Kanban`、`Configs`、`Studio`、`Settings` 仍然是独立模块，但统一纳入新的主控台壳层。
- 仓库发布基础已补齐
  已加入 `.gitignore`、`LICENSE`、可发布的 `package.json` 元信息和新的仓库说明文档。

## 设计来源

本项目不是直接复制上游仓库，而是做了面向 OpenClaw 的整合：

- [ValueCell-ai/ClawX](https://github.com/ValueCell-ai/ClawX)
- [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)

整合原则是：

- 用 ClawX 的产品壳层思路做主控台
- 用 Star Office 的场景化视觉表达 Agent 工作状态
- 用 OpenClaw 自己的 Gateway 协议与功能模块做底层能力

## 模块说明

- `Overview`
  新的任务总览页，统一查看 Gateway、Agent、工作室场景和模块入口。
- `Chat`
  基于 Gateway 的会话、历史消息、引用回复、Agent 提及和配置附件引用。
- `Kanban`
  基于 Gateway 的任务看板、卡片编辑、拖转逻辑和冲突处理。
- `Configs`
  面向 `USER.md`、`SOUL.md`、`MEMORY.md` 的配置查看器。
- `Studio`
  优先显示实时 Flask Studio iframe，失败时自动回退到内置工作室场景。
- `Settings`
  管理连接测试、部署模式、主题、运行参数、诊断日志与离线队列。

## 环境变量

复制 `.env.example` 为 `.env` 后修改：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=ws://your-linux-server:18789
VITE_REMOTE_STUDIO_URL=http://your-linux-server:19000
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

## 本地开发

依赖要求：

- Node.js 18+
- Rust 1.70+
- Tauri 2 工具链

安装依赖：

```bash
npm install
```

启动 Web 模式：

```bash
npm run dev
```

启动 Tauri 模式：

```bash
npm run tauri dev
```

构建：

```bash
npm run build
```

测试：

```bash
npm run test
```

## Gateway 连接说明

- 客户端已按官方式流程完成 Gateway 握手。
- `Gateway Token` 主要用于首次连接或受保护环境。
- 首次配对成功后，服务端返回的设备 Token 会在本地持久化，并用于后续重连。
- 首页和设置页中的 Agent 信息来自 `agents.list`。

## 建议仓库结构

- `src/`
  React 应用、状态层、服务层与各模块界面。
- `src-tauri/`
  Tauri 宿主程序。
- `studio/`
  可选的 Flask 工作室子服务。
- `deploy/`
  Linux / systemd / nginx 部署参考文件。

## GitHub 发布前检查

推送到 GitHub 前建议完成以下检查：

1. 根据你的仓库地址补充 `README.md` 和 `README.zh-CN.md` 的截图与链接。
2. 根据你的实际部署方式完善 `.env.example`。
3. 确认 `npm run build` 与 `npm run test` 都通过。
4. 确认 `.env` 中没有敏感信息被提交。
5. 把界面重构、文档、发布元信息一起提交，保证仓库首页与代码状态一致。

## License

MIT
