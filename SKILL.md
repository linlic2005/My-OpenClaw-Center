---
name: openclaw-center-linux-cloudflare-tunnel-deploy
description: 把 OpenClaw Center 与 OpenClaw Gateway 一起部署到同一台 Linux 服务器，并通过 Cloudflare Tunnel 绑定用户域名，让 Windows PC 可以通过公网浏览器访问 UI、连接 Gateway、使用 Studio。
---

# OpenClaw Center 部署技能

这份技能文档是写给 OpenClaw agent 的。

目标场景已经固定，不要擅自切换为别的方案：

- OpenClaw Center 部署在用户的 Linux 服务器上
- OpenClaw Gateway 也部署在同一台 Linux 服务器上
- 如果启用 Studio，也部署在同一台 Linux 服务器上
- 用户通过挂在 Cloudflare 上的域名访问
- 公网访问通过 Cloudflare Tunnel 完成
- Windows PC 上的浏览器必须能打开 UI，并正常连接 Gateway

## 一、最终部署目标

除非用户明确缩小范围，否则尽量交付下面这套结果：

- `OpenClaw Center` 前端已完成生产构建
- `OpenClaw Gateway` 与 UI 同机工作
- `Studio` 如启用，也与 UI 同机工作
- Nginx 只在服务器本机监听，不直接暴露公网端口
- `cloudflared` 通过 Tunnel 把域名流量转发到本机 Nginx
- 浏览器访问地址为：
  - UI: `https://YOUR_DOMAIN/`
  - Gateway: `wss://YOUR_DOMAIN/gateway/`
  - Studio: `https://YOUR_DOMAIN/studio/`
- 最终给出可验证的部署结果、手动步骤和排障说明

## 二、固定架构

优先使用这套固定结构：

```text
Windows Browser
  -> Cloudflare DNS
  -> Cloudflare Tunnel
  -> cloudflared on Linux
  -> Nginx on 127.0.0.1:8080
  -> UI / Gateway / Studio
```

推荐本机服务绑定方式：

- Nginx: `127.0.0.1:8080`
- Gateway: `127.0.0.1:18789`
- Studio: `127.0.0.1:19000`

不要默认直接把 Gateway 或 Studio 暴露到公网。

## 三、必须遵守的连接前提

在部署或调试时，必须遵守以下前提：

1. 当前前端使用的是官方式 Gateway 握手，不是旧的“连接后直接请求状态”的方式
2. 远程访问必须优先按同域路径来处理
3. 前端 remote 模式必须配置成：
   - `VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/`
   - `VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio`
4. 首次连接若 Gateway 需要共享 token，用户必须能在 Settings 中填写 `Gateway Token`
5. 如果服务端需要批准新设备，必须在最终说明中明确这一点

## 四、优先读取的仓库文件

执行前优先读取并复用这些文件：

- `README.md`
- `README.zh-CN.md`
- `项目说明文档.md`
- `deploy/linux/README.zh-CN.md`
- `deploy/linux/nginx/openclaw-center.conf`
- `deploy/linux/nginx/openclaw-center-cloudflare-tunnel.conf`
- `deploy/linux/cloudflare/config.yml.example`
- `deploy/linux/systemd/openclaw-studio.service`
- `deploy/linux/systemd/openclaw-studio.env.example`
- `studio/requirements-prod.txt`
- `studio/wsgi.py`

## 五、标准执行顺序

### 1. 确认基础信息

先确认或假设以下信息：

- Linux 服务器路径，例如 `/opt/openclaw-center`
- 域名，例如 `openclaw.example.com`
- Cloudflare Tunnel 名称
- Tunnel UUID
- cloudflared 凭据文件路径
- OpenClaw Gateway 是否已经在服务器安装
- 是否启用 Studio

如果用户没有提供完整信息：

- 用占位符写清模板
- 但不要跳过仓库侧准备工作

### 2. 准备前端 remote 配置

前端构建目标应为：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/
VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio
```

然后执行：

```bash
npm install
npm run build
```

### 3. 准备 Studio

如果启用 Studio：

- 使用 `studio/requirements-prod.txt`
- 使用 `studio/wsgi.py`
- 绑定到 `127.0.0.1:19000`
- 使用 `deploy/linux/systemd/openclaw-studio.service`

### 4. 准备 Nginx

Cloudflare Tunnel 方案下，优先使用：

- `deploy/linux/nginx/openclaw-center-cloudflare-tunnel.conf`

要求：

- Nginx 监听 `127.0.0.1:8080`
- `/` 提供前端 `dist/`
- `/gateway/` 转发到 `127.0.0.1:18789`
- `/studio/` 转发到 `127.0.0.1:19000`
- 正确处理 WebSocket Upgrade

### 5. 准备 Cloudflare Tunnel

优先使用：

- `deploy/linux/cloudflare/config.yml.example`

要求：

- 使用用户给定的 tunnel UUID
- hostname 指向用户域名
- service 指向 `http://127.0.0.1:8080`
- 提供 `cloudflared` 安装、登录、创建 tunnel、绑定 hostname、安装服务的完整命令

### 6. 端到端验证

按以下顺序验证：

1. 本机验证 Gateway 端口
2. 本机验证 Studio 健康检查
3. 本机验证 Nginx
4. 本机验证 cloudflared 服务
5. Windows 浏览器打开 `https://YOUR_DOMAIN/`
6. 在 Settings 中验证 Gateway 连接
7. 如需 token，填写 `Gateway Token`
8. 如需设备批准，完成批准后重试
9. 如启用 Studio，验证 `https://YOUR_DOMAIN/studio`

## 六、必须输出的结果格式

OpenClaw agent 最终必须输出下面这些部分：

### A. 部署摘要

明确说明：

- UI 部署在哪个目录
- Gateway 在哪里运行
- Studio 在哪里运行
- Nginx 监听地址
- Cloudflare Tunnel 转发目标
- 浏览器最终访问地址

### B. 已自动完成内容

例如：

- 修改了哪些仓库文件
- 生成了哪些构建产物
- 填好了哪些配置模板

### C. 需要用户手动完成的内容

至少要单独列出：

- Cloudflare 登录或授权
- tunnel 创建或凭据文件放置
- DNS hostname 绑定
- systemctl enable / restart
- Gateway 首次 token 输入
- 服务端设备批准

### D. 验证步骤

给出最短可执行验证流程。

### E. 排障建议

至少覆盖：

- 页面能打开但 Gateway 连接失败
- Tunnel 正常但 `/gateway/` WebSocket 失败
- Studio iframe 无法加载
- 首次连通后后续 token 失效

## 七、禁止事项

不要默认使用这些做法：

- 直接公开 Gateway 原始端口给公网
- 直接公开 Studio 原始端口给公网
- 把浏览器远程访问建立在 `ws://` 裸连接上
- 用“只给一堆命令，不改仓库文件”的方式交付
- 忽略 Cloudflare Tunnel 需要的配置文件和服务说明

## 八、给 OpenClaw 的推荐提示词

把下面这段提示词直接交给 OpenClaw 使用：

```text
使用当前仓库根目录下的 ./SKILL.md 作为部署技能，完成一次“Linux 同机部署 + Cloudflare Tunnel 公网访问”的完整交付。

目标场景：
- OpenClaw Center 部署到我的 Linux 服务器
- OpenClaw Gateway 也部署在同一台 Linux 服务器
- 如果需要，Studio 也部署在同一台 Linux 服务器
- 我通过挂在 Cloudflare 上的域名，从 Windows PC 的浏览器公网访问
- 页面必须能像 OpenClaw 官方 WebUI 一样正常连接 Gateway

固定要求：
- 前端按 remote 模式构建
- UI 使用 https://<我的域名>/
- Gateway 使用 wss://<我的域名>/gateway/
- Studio 使用 https://<我的域名>/studio
- 不要直接暴露 Gateway 或 Studio 原始端口到公网
- 必须通过 Cloudflare Tunnel 转发到本机 Nginx
- Nginx 只监听 127.0.0.1

你必须完成的内容：
- 检查并修改仓库里的部署配置，使其适合这套架构
- 生成或更新适合 Cloudflare Tunnel 的 Nginx 配置
- 生成或更新 cloudflared 的配置模板
- 准备 Studio 的 systemd 配置
- 构建前端
- 如果你无法直接登录我的服务器，也要把仓库侧内容全部准备好，并给我精确到文件路径和命令级别的手动部署步骤

输出时必须分成这些部分：
1. 部署摘要
2. 已自动完成内容
3. 需要我手动完成的内容
4. 验证步骤
5. 排障建议

重点检查项：
- Gateway WebSocket 反代是否正确
- Cloudflare Tunnel 到 Nginx 的路径是否正确
- Settings 中默认远程地址是否与域名一致
- 首次连接的 Gateway Token 和设备批准流程是否说明清楚
```
