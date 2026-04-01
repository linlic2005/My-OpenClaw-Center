---
name: openclaw-center-linux-public-deploy
description: 将 OpenClaw Center 部署到同一台 Linux 服务器，并与该服务器上的 OpenClaw Gateway 配合工作，让 Windows 用户能够通过公网浏览器打开页面和使用系统。适用于用户明确提到 Linux 服务器、公网访问、同机部署 Gateway、Nginx、HTTPS/WSS、systemd，或要求区分自动步骤与手动步骤时。
---

# OpenClaw Center Linux 公网部署技能

本技能是写给 OpenClaw agent 的部署说明。

目标场景已经固定，不要擅自切换到别的部署方案：

- OpenClaw Center 部署在用户的 Linux 服务器上
- OpenClaw Gateway 也部署在这同一台 Linux 服务器上
- Windows 用户通过公网浏览器访问页面
- 页面必须能正常连接同机部署的 Gateway

如果没有特殊说明，默认按“浏览器公网访问 + 同机 Gateway + 同域反向代理”方案实施。

## 一、最终目标

除非用户明确缩小范围，否则尽量交付以下结果：

- 前端完成生产构建
- UI 可由公网浏览器访问
- Gateway 与 UI 通过同域反向代理连通
- Windows 端可直接打开页面并完成 Gateway 连接
- Studio 如有启用，也通过同域方式接入
- 产出完整的部署说明、验证步骤和问题边界说明

## 二、固定部署方式

优先使用以下结构，不要随意改成直连端口暴露：

- UI: `https://<你的域名>/`
- Gateway: `wss://<你的域名>/gateway/`
- Studio: `https://<你的域名>/studio`

原因：

- Windows 公网浏览器访问时，更容易满足安全上下文要求
- 当前 Gateway 官方连接方式依赖设备签名与正式握手，远程环境优先使用 HTTPS/WSS
- 可避免浏览器 mixed-content 问题
- 可减少跨域 iframe 与跨域认证问题

## 三、必须遵守的连接前提

OpenClaw agent 在处理部署时，必须把以下前提写清楚并按此实现：

1. 不要使用旧的“连接 WebSocket 后直接调用 `gateway.get_status`”方案。
2. 当前客户端使用的是官方 Gateway 连接流程：
   - 接收 `connect.challenge`
   - 发送 `req/connect`
   - 首连使用 `Gateway Token`
   - 成功后缓存 paired-device token
3. 远程公网访问时，默认需要：
   - 页面使用 `https://`
   - Gateway 使用 `wss://`
4. 如果用户只给了 IP 没给域名，也要明确告诉用户：
   - 可以临时调试
   - 但正式公网环境更推荐域名 + HTTPS 证书

## 四、部署时优先使用的仓库文件

在开始部署前，优先读取并复用以下文件：

- `README.md`
- `README.zh-CN.md`
- `项目说明文档.md`
- `deploy/linux/README.zh-CN.md`
- `deploy/linux/nginx/openclaw-center.conf`
- `deploy/linux/systemd/openclaw-studio.service`
- `deploy/linux/systemd/openclaw-studio.env.example`
- `studio/requirements-prod.txt`
- `studio/wsgi.py`

## 五、执行原则

- 优先修改仓库内配置文件，而不是只给零散命令
- 优先使用 Nginx 同域反向代理，不要默认公开暴露 Gateway 原始端口
- 如果用户没有提供完整生产信息，先用清晰占位符补齐模板
- 如果当前环境无法登录用户服务器，也要完成仓库侧所有准备，并给出精确的手动执行说明
- 必须明确标出“自动完成项”和“需要用户手动处理项”
- 如果某一步因为权限、证书、DNS、云防火墙、服务器访问权限制而无法完成，不能模糊带过，必须单独列出来

## 六、标准执行流程

### 1. 先确认公网访问入口

确认或假设以下信息：

- 公网域名，或临时公网 IP
- Nginx 站点根路径
- UI 最终访问地址
- Gateway 是否通过 `/gateway/` 反代
- Studio 是否通过 `/studio` 反代

如果用户没有给这些值：

- 先用 `YOUR_DOMAIN`
- 在结果中单列“待用户补充信息”

### 2. 准备前端生产配置

目标是让前端默认工作在远程模式。

优先准备成：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/
VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio
```

如果当前只能先走内网或临时调试，也可以给出临时值，但必须说明：

- 这是临时方案
- 正式公网使用时应切回 HTTPS/WSS

### 3. 构建前端

执行标准构建：

```bash
npm run build
```

把 `dist/` 视为待部署产物。

### 4. 处理 Gateway 接入方式

本技能默认假设：

- OpenClaw Gateway 已经或将要运行在同一台 Linux 服务器上
- UI 通过 Nginx 转发到 Gateway

OpenClaw agent 在交付时必须明确说明：

- Gateway 实际监听地址是什么
- Nginx 如何把 `/gateway/` 转发过去
- 公网浏览器最终访问的是哪个 `wss://` 地址
- 首次连接时用户是否需要在页面 Settings 中填写 `Gateway Token`

### 5. 处理 Studio 服务

如果仓库当前启用了 Studio：

- 使用 `studio/wsgi.py`
- 使用 `studio/requirements-prod.txt`
- 使用 `deploy/linux/systemd/openclaw-studio.service`

推荐部署方式：

- Studio 绑定在 `127.0.0.1:19000`
- 再由 Nginx 通过 `/studio` 反向代理

### 6. 配置 Nginx

默认基于 `deploy/linux/nginx/openclaw-center.conf` 调整。

至少要确认以下内容：

- `/` 指向前端 `dist/`
- `/gateway/` 正确转发 WebSocket 升级头
- `/studio/` 正确反代 Studio
- HTTPS 证书路径明确

### 7. 端到端验证

验证顺序建议固定如下：

1. Linux 本机验证 Studio 健康检查
2. Linux 本机验证 Nginx 配置语法
3. 公网浏览器打开 `https://<domain>/`
4. 打开 Settings
5. 如有需要，填写 `Gateway Token`
6. 测试 Gateway 连接
7. 如服务端要求审批设备，在服务端批准后再次重试
8. 打开 Workspace，确认 Studio 正常加载

## 七、必须在结果中单独输出的两类内容

OpenClaw agent 完成任务时，必须明确输出以下两个独立部分，不能混写：

### A. 已自动完成的内容

这里列出 agent 已经实际完成的内容，例如：

- 修改了哪些仓库文件
- 已生成哪些构建产物
- 已准备哪些部署模板
- 已补哪些 README / 配置 / systemd / nginx 内容

### B. 需要用户手动处理的内容

这里必须单独列出所有 agent 无法替用户完成、但部署成功又必不可少的事项。

至少包括以下类别：

- 域名解析
- HTTPS 证书申请或安装
- Linux 服务器登录权限
- Nginx / systemd 重载
- 云防火墙 / 安全组放行
- OpenClaw Gateway 的真实启动与运行确认
- 首次连接时需要填写的 `Gateway Token`
- 如果服务端需要手动批准设备，则说明审批入口与步骤

如果某项当前不确定，也必须写成“待用户确认项”。

## 八、必须主动提醒用户的常见问题

OpenClaw agent 在交付说明里必须主动提醒以下问题，而不是等用户问：

- 如果没有域名和证书，公网浏览器环境下可能无法达到最佳连接效果
- 如果 Gateway 只监听 localhost，必须通过 Nginx 反向代理或 SSH 隧道接入
- 如果页面能打开但连不上 Gateway，优先检查：
  - `/gateway/` 是否正确反代
  - 是否使用了 `wss://`
  - `Gateway Token` 是否正确
  - 服务端是否需要手动批准新设备
- 如果首次连通过、后续又失败，要检查 paired-device token 是否失效

## 九、交付格式要求

当 OpenClaw agent 输出部署结果时，建议至少包含以下部分：

1. 部署架构摘要
2. 已修改文件列表
3. Linux 服务器需执行的命令
4. 已自动完成项
5. 需要用户手动处理项
6. 验证步骤
7. 已知风险或未完成项

## 十、推荐直接使用的提示词

如果用户要把任务直接交给 OpenClaw，可优先使用这段提示词：

```text
使用根目录 ./SKILL.md 中的部署技能，按这个固定场景完成部署：

- OpenClaw Center 部署在我的 Linux 服务器上
- OpenClaw Gateway 也部署在这同一台 Linux 服务器上
- 让我能在 Windows 公网浏览器里打开页面并正常连接 Gateway

要求：
- 优先使用 Nginx 同域反向代理
- UI 走 https://<domain>/
- Gateway 走 wss://<domain>/gateway/
- 如启用 Studio，走 https://<domain>/studio
- 前端按 remote 模式构建
- 需要把仓库内该改的文件都改好
- 如果你无法直接访问服务器，也要把仓库侧准备完整，并给我精确的手动命令
- 最后必须单独列出：
  1. 你已经自动完成的内容
  2. 需要我手动处理的内容
  3. 可能遇到的问题与排查建议
```
