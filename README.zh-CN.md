[![English](https://img.shields.io/badge/README-English-2563eb?style=for-the-badge)](./README.md)
[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-16a34a?style=for-the-badge)](./README.zh-CN.md)

# OpenClaw Center

OpenClaw Center 是一个基于 React + TypeScript + Tauri 2 的 OpenClaw 桌面客户端。

它现在支持两种主要部署方式：

1. 纯本地部署
   Gateway 和 Studio 与桌面客户端运行在同一台机器上。
2. Windows 客户端 + Linux 服务器
   桌面客户端运行在 Windows，Gateway 和可选的 Studio 运行在 Linux 服务器上。

项目已经同时保留了这两种模式，并通过环境变量预设和应用内的部署切换来管理。

## 功能说明

### 核心模块

- Chat
  基于真实 Gateway 的聊天模块，支持会话、历史消息加载、引用回复、提及和配置文件附件。
- Kanban
  基于真实 Gateway 的看板模块，支持卡片加载、创建、编辑、移动、删除和冲突处理。
- Files
  专注于 `USER.md`、`SOUL.md`、`MEMORY.md` 的 Agent 配置查看器，支持元数据卡片、可读视图、结构视图、原始视图和导出。
- Workspace
  当 Studio 服务可访问时嵌入远程 iframe；不可访问时回退到本地内置工作区视图。
- Settings
  支持部署模式切换、Gateway/Studio 地址配置、外观设置、运行时设置、诊断导出、错误日志和离线队列查看。

### 稳定性能力

- 真实 WebSocket Gateway 连接
- 心跳与自动重连
- 离线队列持久化
- 错误日志持久化
- 设置与聊天草稿持久化
- Tauri SQL 回退到 localStorage

## 当前各模块状态

### 目前已支持远程使用的核心能力

- Chat
- Kanban
- 配置文件查看和文件导出/下载
- Gateway 连接检测
- 通过 `gateway.get_agents` 获取 Agent 列表

### 当前仍为本地偏好状态的 UI

- Settings 中的技能安装 / 卸载 / 启用 / 停用
  目前只是本地偏好状态，不会真正调用远程技能安装协议。
- Settings 中的频道管理
  目前是本地管理，不会真正调用远程频道 CRUD。

### Workspace 行为

- 如果 `Studio URL` 可访问，Workspace 会自动嵌入远程 Studio 页面。
- 如果 `Studio URL` 不可访问，或关闭了嵌入，则会回退到本地工作区视图。

## 部署模式

应用内 Settings 支持三种运行模式：

- `Local`
  使用 `.env` 中的本地预设
- `Remote`
  使用 `.env` 中的远程预设
- `Custom`
  手动分别填写 `Gateway URL` 和 `Studio URL`

## 环境变量配置

将 `.env.example` 复制为 `.env`，然后按实际环境修改：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=ws://your-linux-server:18789
VITE_REMOTE_STUDIO_URL=http://your-linux-server:19000
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

### 推荐配置

#### 纯本地部署

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
```

#### Windows 客户端 + Linux 服务器

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_REMOTE_WS_URL=ws://YOUR_LINUX_HOST:18789
VITE_REMOTE_STUDIO_URL=http://YOUR_LINUX_HOST:19000
```

如果是生产环境，建议优先使用 `wss://` 和 `https://`。

## 如何部署

### 方案一：纯本地部署

1. 在本机启动 OpenClaw Gateway。
2. 如果需要 iframe 工作区，再在本机启动 Studio。
3. 将 `.env` 中的本地地址配置成 `127.0.0.1`。
4. 启动桌面客户端。
5. 在 Settings 里保持 `Deployment Mode = Local`。

### 方案二：Windows 桌面客户端 + Linux 服务器

1. 在 Linux 上部署 OpenClaw Gateway，并开放对应 WebSocket 端口。
2. 如果需要 iframe 工作区，在 Linux 上部署 Studio。
3. 确保 Windows 机器可以访问 Linux 服务器。
4. 打开服务器防火墙和安全组端口。
5. 在 `.env` 中填入远程 Gateway 和 Studio 地址。
6. 在 Windows 上构建并启动桌面客户端。
7. 在 Settings 里切换到 `Remote`，或者改成 `Custom` 手动填写地址。

### Linux 服务器检查项

- Gateway 必须暴露客户端实际访问的 WebSocket 地址
- 如果要用 Workspace iframe，Studio 必须暴露 `/health` 和主页面
- 如果 Studio 是跨域地址，必须允许被 iframe 嵌入
- 反向代理、CSP、`X-Frame-Options` 不能阻止嵌入
- 如果使用 HTTPS，需要保证 Windows 客户端信任证书

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

## 各模块如何使用

### Chat

- 打开 Chat 标签
- 创建或选择一个会话
- 输入消息后按 `Enter` 发送
- 使用 `Shift+Enter` 换行
- 按需使用引用回复和提及
- 可附加 `USER.md`、`SOUL.md`、`MEMORY.md` 等配置文件

### Kanban

- 打开 Kanban 标签
- 在列中创建卡片
- 编辑标题和描述
- 跨列移动卡片
- 如果服务器返回冲突状态，可在界面中处理冲突

### Files

- 打开 Files 标签
- 浏览 Agent 目录
- 选择 `USER.md`、`SOUL.md` 或 `MEMORY.md`
- 使用：
  - `Readable` 查看更适合阅读的内容
  - `Outline` 查看结构和覆盖情况
  - `Raw` 查看原始内容
- 需要时导出副本

### Workspace

- 打开 Workspace 标签
- 如果 `Studio URL` 可访问，会自动嵌入远程 Studio 页面
- 如果不可访问，会自动回退到本地内置工作区视图
- 也可以在 Settings 中关闭嵌入，始终使用回退视图

### Settings

- 在 `Local`、`Remote`、`Custom` 之间切换部署模式
- 编辑 `Gateway URL` 和 `Studio URL`
- 测试 Gateway 连通性
- 调整主题、语言、字号和紧凑模式
- 查看错误日志和离线队列
- 导出诊断包

## 说明

- Files 模块不是通用上传器 UI，它主要聚焦于 Agent 配置查看。
- 当前项目中的 Studio 仅支持中文和英文。
- 部分 Settings 管理功能仍是本地偏好 UI，等远程协议明确后再接入真实服务。
