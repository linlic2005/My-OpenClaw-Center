# Linux 部署说明

这个项目可以作为纯 Web UI 部署在 Linux 服务器上，然后在 Windows 浏览器中访问。

推荐使用同域反向代理：

- UI: `https://YOUR_DOMAIN/`
- Gateway WebSocket: `wss://YOUR_DOMAIN/gateway/`
- Studio: `https://YOUR_DOMAIN/studio`

这样做有几个好处：

- 不需要额外开放多个高位端口给 Windows 客户端
- 避免浏览器的混合内容问题
- `Studio` iframe 更容易正常加载
- 后续加 HTTPS 证书和权限控制更方便

## 一、部署目标

你最终会得到下面这套结构：

- OpenClaw Gateway 运行在 Linux 上，例如 `127.0.0.1:18789`
- Studio 运行在 Linux 上，例如 `127.0.0.1:19000`
- OpenClaw Center UI 构建为静态文件，由 Nginx 提供
- Windows 浏览器直接打开 `https://YOUR_DOMAIN/`

## 二、构建 UI

在项目根目录创建 `.env.production`，可以参考同目录下的 `.env.production.example`。

推荐使用同域地址：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/
VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

如果你现在只是内网测试，没有 HTTPS，也可以改成：

```env
VITE_REMOTE_WS_URL=ws://YOUR_SERVER_IP/gateway/
VITE_REMOTE_STUDIO_URL=http://YOUR_SERVER_IP/studio
```

然后构建：

```bash
npm install
npm run build
```

构建完成后，把 `dist/` 放到服务器上的静态目录，例如：

```bash
/opt/openclaw-center/dist
```

## 三、部署 Studio

Studio 默认支持通过环境变量指定监听地址。

推荐只监听本机回环地址，再交给 Nginx 反代：

```bash
cd /opt/openclaw-center/studio
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-prod.txt
```

示例环境变量：

```bash
export STUDIO_HOST=127.0.0.1
export STUDIO_PORT=19000
export FLASK_SECRET_KEY='change-me'
export STATUS_FILE_PATH='/root/.openclaw/workspace-taizibot/.lifecycle/live_status.json'
```

仓库里已经提供了：

- `studio/wsgi.py`
- `deploy/linux/systemd/openclaw-studio.service`

把 systemd 文件复制到：

```bash
/etc/systemd/system/openclaw-studio.service
```

然后按你的实际路径修改：

- `WorkingDirectory`
- `EnvironmentFile`
- `ExecStart`
- `User`
- `Group`

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-studio
sudo systemctl status openclaw-studio
```

## 四、配置 Nginx

仓库里提供了 Nginx 模板：

- `deploy/linux/nginx/openclaw-center.conf`

它会完成三件事：

- `/` 提供前端静态文件
- `/gateway/` 反代到本机 Gateway WebSocket
- `/studio/` 反代到本机 Studio HTTP 服务

复制到服务器后，修改这些值：

- `server_name`
- `root`
- Gateway 上游地址
- Studio 上游地址

启用配置后重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 五、Gateway 要求

这个 UI 依赖 Gateway 提供以下能力：

- WebSocket 连接
- `gateway.get_status`
- `gateway.get_agents`
- `chat.*`
- `kanban.*`
- `file.*`

如果你的 OpenClaw Gateway 已经在 Linux 上运行，只需要保证：

- 它能被 Nginx 反代访问到
- WebSocket upgrade 正常
- 返回的协议和当前 UI 对齐

推荐也只监听本机：

```text
127.0.0.1:18789
```

再由 Nginx 暴露给外部。

## 六、Windows 访问方式

完成部署后，在 Windows 浏览器打开：

```text
https://YOUR_DOMAIN/
```

第一次进入后，打开 Settings，确认：

- `Deployment Mode = Remote`
- `Gateway URL = wss://YOUR_DOMAIN/gateway/`
- `Studio URL = https://YOUR_DOMAIN/studio`

如果你构建时已经写入这两个地址，通常默认就是正确的。

## 七、常见问题

### 1. UI 打开了，但 Gateway 连不上

优先检查：

- Gateway 进程是否正常
- Nginx 的 `/gateway/` 是否配置了 WebSocket 头
- 浏览器里是否用了 `https://` 页面却连接了 `ws://`

如果页面是 HTTPS，Gateway 必须使用 `wss://`。

### 2. Studio 健康检查正常，但 iframe 不显示

优先检查：

- `Studio URL` 是否可直接在浏览器打开
- 反代后是否保留了正确路径
- 是否被额外的 `X-Frame-Options` 或 CSP 阻止

当前仓库里的 Flask Studio 本身没有主动设置禁止 iframe 的头。

### 3. 只想先打通，不想上 HTTPS

可以先在内网环境用：

- `http://YOUR_SERVER_IP/`
- `ws://YOUR_SERVER_IP/gateway/`
- `http://YOUR_SERVER_IP/studio`

但如果未来要跨公网访问，建议尽快上 HTTPS/WSS。

## 八、最简部署顺序

1. 在 Linux 上确认 Gateway 已运行
2. 在 Linux 上启动 Studio
3. 为前端写 `.env.production`
4. 执行 `npm run build`
5. 用 Nginx 提供 `dist/`
6. 用 Nginx 反代 `/gateway/` 和 `/studio/`
7. 在 Windows 浏览器打开域名测试
