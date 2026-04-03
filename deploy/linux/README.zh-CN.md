# Linux + Cloudflare Tunnel 部署说明

这份说明针对下面这个固定场景：

- `OpenClaw Center` 部署在 Linux 服务器
- `OpenClaw Gateway` 也在同一台 Linux 服务器
- `Studio` 如启用，也在同一台 Linux 服务器
- 对外访问通过 `Cloudflare Tunnel`
- Windows PC 通过浏览器公网访问

## 一、推荐架构

```text
Windows Browser
  -> Cloudflare DNS
  -> Cloudflare Tunnel
  -> cloudflared on Linux
  -> Nginx on 127.0.0.1:8080
  -> UI / Gateway / Studio
```

推荐本机监听：

- Nginx: `127.0.0.1:8080`
- Gateway: `127.0.0.1:18789`
- Studio: `127.0.0.1:19000`

## 二、最终访问地址

- UI: `https://YOUR_DOMAIN/`
- Gateway: `wss://YOUR_DOMAIN/gateway/`
- Studio: `https://YOUR_DOMAIN/studio`

## 三、仓库内模板文件

请优先使用这些模板：

- Cloudflare Tunnel 场景的 Nginx 配置
  [openclaw-center-cloudflare-tunnel.conf](/C:/Users/linlic/Desktop/Openclaw%20Center/deploy/linux/nginx/openclaw-center-cloudflare-tunnel.conf)
- 普通同域 Nginx 配置
  [openclaw-center.conf](/C:/Users/linlic/Desktop/Openclaw%20Center/deploy/linux/nginx/openclaw-center.conf)
- cloudflared 配置模板
  [config.yml.example](/C:/Users/linlic/Desktop/Openclaw%20Center/deploy/linux/cloudflare/config.yml.example)
- Studio systemd 服务模板
  [openclaw-studio.service](/C:/Users/linlic/Desktop/Openclaw%20Center/deploy/linux/systemd/openclaw-studio.service)

## 四、前端构建

建议使用 remote 模式：

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/
VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio
```

然后构建：

```bash
npm install
npm run build
```

构建产物默认部署到：

```bash
/opt/openclaw-center/dist
```

## 五、Studio 部署

如启用 Studio：

```bash
cd /opt/openclaw-center/studio
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-prod.txt
```

推荐监听：

```bash
127.0.0.1:19000
```

然后使用 systemd 模板：

```bash
sudo cp /opt/openclaw-center/deploy/linux/systemd/openclaw-studio.service /etc/systemd/system/openclaw-studio.service
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-studio
```

## 六、Nginx 部署

Cloudflare Tunnel 方案下，推荐用：

- `deploy/linux/nginx/openclaw-center-cloudflare-tunnel.conf`

核心原则：

- Nginx 只监听 `127.0.0.1:8080`
- `/` 提供前端
- `/gateway/` 转发 WebSocket 到本机 Gateway
- `/studio/` 转发到本机 Studio

部署示例：

```bash
sudo cp /opt/openclaw-center/deploy/linux/nginx/openclaw-center-cloudflare-tunnel.conf /etc/nginx/conf.d/openclaw-center.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 七、Cloudflare Tunnel 部署

推荐流程：

1. 安装 `cloudflared`
2. 登录 Cloudflare
3. 创建 tunnel
4. 创建 public hostname
5. 使用本仓库的 `deploy/linux/cloudflare/config.yml.example` 作为配置模板
6. 安装并启用 cloudflared systemd 服务

配置核心是：

```yaml
hostname: YOUR_DOMAIN
service: http://127.0.0.1:8080
```

也就是说，Tunnel 只需要把域名流量转给本机 Nginx 即可，Gateway 和 Studio 都继续由 Nginx 分发。

## 八、验证顺序

建议按这个顺序验证：

1. Gateway 本机端口是否监听
2. Studio 本机健康检查是否正常
3. Nginx 是否能在本机访问 `127.0.0.1:8080`
4. cloudflared 服务是否正常
5. Windows 浏览器打开 `https://YOUR_DOMAIN/`
6. 在 Settings 中测试 Gateway
7. 如需要，填写 `Gateway Token`
8. 如服务端需要批准设备，在服务器侧批准后重试

## 九、常见问题

### 1. 页面能打开，但 Gateway 连不上

优先检查：

- Nginx `/gateway/` 是否正确转发
- WebSocket Upgrade 头是否保留
- 浏览器访问是否是 `https://`，而 Gateway 是否对应 `wss://`
- `Gateway Token` 是否正确
- 服务端是否需要批准新设备

### 2. Studio 不显示

优先检查：

- `127.0.0.1:19000` 是否正常
- `/studio/` 反代是否正确
- Flask Studio 是否允许 iframe 嵌入

### 3. Tunnel 正常但域名打不开

优先检查：

- Cloudflare public hostname 是否已绑定
- `credentials-file` 路径是否正确
- cloudflared 服务是否启动

## 十、建议

如果后续希望把部署完整交给 OpenClaw，请直接使用仓库根目录的 [SKILL.md](/C:/Users/linlic/Desktop/Openclaw%20Center/SKILL.md)。
