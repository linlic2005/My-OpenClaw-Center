[![English](https://img.shields.io/badge/README-English-2563eb?style=for-the-badge)](./README.md)
[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-16a34a?style=for-the-badge)](./README.zh-CN.md)

# OpenClaw Center

OpenClaw Center 是一个基于 React + TypeScript + Tauri 2 的 OpenClaw 客户端。

它同时面向两种部署形态：

1. 纯本地部署
   Gateway 和 Studio 与客户端运行在同一台机器上。
2. Windows 客户端 + Linux 服务器
   客户端运行在 Windows 上，Gateway 和可选的 Studio 运行在 Linux 服务器上。

项目现在已经切换到官方 OpenClaw Gateway 连接方式，不再使用旧的“连接后直接调用 `gateway.get_status`”流程。

## 功能

### 核心模块

- Chat
  基于真实 Gateway 的聊天模块，支持会话、历史消息加载、引用回复、提及和配置文件附件。
- Kanban
  基于真实 Gateway 的看板模块，支持卡片加载、创建、编辑、移动、删除和冲突处理。
- Files
  面向 `USER.md`、`SOUL.md`、`MEMORY.md` 的配置文件查看与导出。
- Workspace
  可嵌入远程 Studio，也可回退到内置本地视图。
- Settings
  支持部署切换、Gateway/Studio 地址、Gateway Token、外观设置、诊断和离线队列查看。

### 可靠性能力

- 官方 OpenClaw Gateway 握手流程：`connect.challenge` + `req/connect`
- 心跳与自动重连
- 离线队列持久化
- 错误日志持久化
- 设置和聊天草稿持久化
- paired-device token 持久化与后续复用
- Tauri SQL 不可用时自动回退到 `localStorage`

## 当前远程能力

- Chat
- Kanban
- 配置文件目录浏览、导出和下载
- Gateway 连接检测
- 通过 `agents.list` 获取 Agent 列表

## 环境变量

复制 `.env.example` 为 `.env` 后按实际环境调整：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=ws://your-linux-server:18789
VITE_REMOTE_STUDIO_URL=http://your-linux-server:19000
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

首次远程连接时，请在 Settings 中填写 Gateway 发放的 onboarding token。
客户端会把它仅保存在本机，并按官方协议放入 `connect.auth.token`；诊断导出会自动脱敏。
首次连接成功后，Gateway 返回的 paired-device token 也会被持久化，后续重连优先复用。

## 部署方式

### 方案 1：纯本地部署

1. 在本机启动 OpenClaw Gateway。
2. 如果需要 iframe Workspace，再启动本机 Studio。
3. 将 `.env` 中的本地地址配置为 `127.0.0.1`。
4. 启动客户端。
5. 在 Settings 中保持 `Deployment Mode = Local`。

### 方案 2：Windows 客户端 + Linux 服务器

1. 在 Linux 上部署 OpenClaw Gateway，并暴露其 WebSocket 入口。
2. 如果需要 iframe Workspace，再部署 Studio。
3. 如果不是 localhost，请优先使用 HTTPS 页面和 `wss://` Gateway。
4. 确保 Windows 机器可以访问 Linux 服务器。
5. 放通所需端口和安全组规则。
6. 在 `.env` 中填写远程 Gateway 和 Studio 地址，或填写反向代理路径。
7. 构建并运行客户端。
8. 在 Settings 中切换到 `Remote`，或者使用 `Custom` 手动填写地址。
9. 在 `Gateway Token` 中输入首次连接需要的 onboarding token。
10. 如果 Gateway 开启了手动设备审批，请在服务器端批准新的 operator 设备后再重试一次。

### 方案 2A：通过 SSH 隧道连接 Linux 服务器

如果 Linux 上的 Gateway 或 Studio 只监听 `127.0.0.1`，而且不能改成 `0.0.0.0`，推荐使用这个方案。

```powershell
ssh -N -L 18789:127.0.0.1:18789 -L 19000:127.0.0.1:19000 your-user@YOUR_LINUX_HOST
```

然后在 Settings 中使用：

```text
Gateway URL: ws://127.0.0.1:18789
Studio URL:  http://127.0.0.1:19000
```

## Gateway 认证说明

- OpenClaw Gateway 不再支持“连上 WebSocket 后直接调用 `gateway.get_status`”这种旧流程。
- 客户端现在按官方方式连接：先接收 `connect.challenge`，再发送 `req/connect`，并在 `hello-ok` 后持久化 paired-device token。
- `Gateway Token` 主要用于首连或 token 保护的服务器。只有在设备已经配对过，或者服务端明确允许本地不安全认证时，才可以留空。
- 如果服务端返回 paired-device token 失效，客户端会自动清除本地缓存，并回退到共享 Gateway token 再试一次。

## Linux 服务器检查清单

- Gateway 必须暴露客户端真正访问的 WebSocket 地址。
- 远程浏览器客户端建议使用 HTTPS/WSS，这样 WebCrypto 设备签名才能在安全上下文中工作。
- Studio 如果要被嵌入，必须暴露 `/health` 和主页面。
- 如果 Studio 跨域，需确认 iframe、CSP 和 `X-Frame-Options` 不会阻止嵌入。
- 如果使用 HTTPS，请确认 Windows 客户端信任证书。

## 使用 OpenClaw 完成 Linux 部署

如果你希望 OpenClaw 直接接管部署流程，请使用根目录下的 [SKILL.md](./SKILL.md)。
它会引导 OpenClaw agent 完成 Linux 端部署，包括前端构建、生产地址设置、Nginx 反向代理、Studio 服务化，以及从 Windows 浏览器访问时的验证步骤。

推荐提示词：

```text
使用根目录 ./SKILL.md 中的部署技能，完成这个仓库在 Linux 服务器上的端到端部署。

目标：
- 把 OpenClaw Center 的 UI 部署到我的 Linux 服务器
- 让 OpenClaw Gateway 和 Studio 运行在同一台 Linux 服务器上
- 让我能从 Windows 浏览器访问并操作

要求：
- 优先使用 Nginx 同域反向代理
- 前端按 remote 模式构建
- Gateway 配置到 /gateway/，Studio 配置到 /studio
- 完成仓库内所需的配置和文档更新
- 如果当前没有服务器权限，就先完成仓库侧准备并给出精确命令
- 最后给我一份验证清单和剩余手动步骤
```

## 本地开发

### 前置要求

- Node.js 18+
- Rust 1.70+
- Tauri 2 工具链

### 安装依赖

```bash
npm install
```

### 启动 Web 开发模式

```bash
npm run dev
```

### 启动 Tauri 桌面模式

```bash
npm run tauri dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm run test
```
