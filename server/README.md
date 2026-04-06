# OpenClaw Web Console — Server

## 本地开发

```bash
cd server
cp .env.example .env    # 编辑配置
npm install
npm run dev             # 启动开发服务器 (http://localhost:4000)
```

前端联调：
```bash
# 在前端目录
VITE_API_BASE_URL=http://localhost:4000/api npm run dev
```

## API 端点

| Path | Description |
|------|-------------|
| `GET /api/health` | 健康检查（无需认证） |
| `POST /api/auth/login` | 登录 |
| `GET /api/auth/me` | 当前用户 |
| `GET /api/agents` | Agent 列表 |
| `GET/POST /api/chat/sessions` | 会话管理 |
| `POST /api/chat/sessions/:sid/messages` | 发送消息（SSE 流式回复） |
| `GET /api/office/rooms` | Office 房间 |
| `GET /api/office/agents` | Agent 锚点 |
| `GET /api/channels` | 渠道列表 |
| `GET /api/tasks` | 任务列表 |
| `GET /api/skills` | 技能列表 |
| `GET /api/settings` | 系统设置 |
| `GET /api/logs/stream` | 实时日志（SSE） |
| `GET /api/logs/metrics` | 系统指标 |
| `GET /api/audit` | 审计日志 |
| `WS /ws?token=xxx` | WebSocket 实时通信 |

## WebSocket

连接: `ws://localhost:4000/ws?token=<jwt>`

订阅频道:
```json
{"type":"subscribe","channel":"agents"}
{"type":"subscribe","channel":"logs"}
{"type":"subscribe","channel":"office"}
{"type":"subscribe","channel":"chat:session-id"}
```

## 认证

默认管理员: `admin / admin123`（在 `.env` 中配置）

```bash
# 登录
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 使用 token
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/agents
```

## 部署

### Docker

```bash
cd server
docker build -t openclaw-server .
docker run -d -p 4000:4000 --env-file .env openclaw-server
```

### Nginx 反向代理

```nginx
server {
    listen 443 ssl;
    server_name console.example.com;

    ssl_certificate     /etc/ssl/certs/console.pem;
    ssl_certificate_key /etc/ssl/private/console.key;

    # 前端
    location / {
        root /var/www/openclaw/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SSE (disable buffering)
    location ~ /api/chat/sessions/.*/messages {
        proxy_pass http://127.0.0.1:4000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }

    location /api/logs/stream {
        proxy_pass http://127.0.0.1:4000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
    }
}
```

### systemd

```ini
[Unit]
Description=OpenClaw Server
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/opt/openclaw/server
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/openclaw/server/.env

[Install]
WantedBy=multi-user.target
```

## 数据库

SQLite 数据库文件位于 `data/openclaw.db`。首次启动自动创建并运行迁移。

备份：`cp data/openclaw.db data/openclaw.db.bak`
