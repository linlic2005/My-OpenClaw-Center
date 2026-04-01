[![English](https://img.shields.io/badge/README-English-2563eb?style=for-the-badge)](./README.md)
[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-16a34a?style=for-the-badge)](./README.zh-CN.md)

# OpenClaw Center

OpenClaw Center is a React + TypeScript + Tauri 2 desktop client for OpenClaw.

It is designed for two deployment styles:

1. Pure local deployment
   Run Gateway and Studio on the same machine as the desktop app.
2. Windows client + Linux server
   Run the desktop app on Windows, while Gateway and optional Studio run on a Linux server.

The project now keeps both modes at the same time through environment presets and an in-app deployment switch in Settings.

## Features

### Core modules

- Chat
  Real Gateway-backed chat sessions, message history loading, quoted replies, mentions, and config-file attachments.
- Kanban
  Real Gateway-backed board loading, card creation, editing, moving, deleting, and conflict resolution.
- Files
  Agent config viewer focused on `USER.md`, `SOUL.md`, and `MEMORY.md`, with metadata cards, readable view, outline view, raw view, and export.
- Workspace
  Supports Studio iframe embedding when a Studio service is reachable, and falls back to a local visual workspace when it is not.
- Settings
  Deployment switching, Gateway and Studio endpoint configuration, appearance, runtime behavior, diagnostics, error logs, and offline queue inspection.

### Reliability features

- Official OpenClaw Gateway handshake (`connect.challenge` + `connect`)
- Heartbeat and reconnect
- Offline queue persistence
- Error log persistence
- Settings and chat draft persistence
- Paired-device token persistence for reconnects
- Tauri SQL fallback to localStorage

## Current behavior by module

### Fully or mostly remote-capable today

- Chat
- Kanban
- File listing and file export/download for config viewing
- Gateway connection health
- Agent list loading from `agents.list`

### Local preference UI for now

- Skill install/uninstall/enable/disable in Settings
  The UI is present, but it currently stores local preference state and does not call a documented remote install protocol yet.
- Channel management in Settings
  The UI is present, but it is currently local-only and does not call remote channel CRUD yet.

### Workspace behavior

- If `Studio URL` is reachable, Workspace embeds the remote Studio page in an iframe.
- If `Studio URL` is unreachable or embedding is disabled, Workspace falls back to the built-in local visualization.

## Deployment modes

The app supports three runtime modes in Settings:

- `Local`
  Uses the local preset from `.env`
- `Remote`
  Uses the remote preset from `.env`
- `Custom`
  Lets you manually edit `Gateway URL` and `Studio URL`

## Environment configuration

Copy `.env.example` to `.env` and adjust the values.

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=ws://your-linux-server:18789
VITE_REMOTE_STUDIO_URL=http://your-linux-server:19000
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

Enter the Gateway onboarding token in Settings on the first remote connection.
The app stores that token locally, uses it as `connect.auth.token`, and redacts it from exported diagnostics.
After the first successful pairing, the app also persists the Gateway-issued paired-device token and can reuse it on later reconnects.

### Recommended values

#### Pure local deployment

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
```

#### Windows client + Linux server

```env
VITE_DEFAULT_DEPLOYMENT_MODE=remote
VITE_REMOTE_WS_URL=ws://YOUR_LINUX_HOST:18789
VITE_REMOTE_STUDIO_URL=http://YOUR_LINUX_HOST:19000
```

If you use TLS in production, prefer `wss://` for Gateway and `https://` for Studio.

## How to deploy

### Option 1: Pure local deployment

1. Start OpenClaw Gateway on the same machine.
2. Start Studio on the same machine if you want iframe Workspace support.
3. Set `.env` local URLs to `127.0.0.1`.
4. Launch the app.
5. In Settings, keep `Deployment Mode` as `Local`.

### Option 2: Windows desktop + Linux server

1. Deploy OpenClaw Gateway on Linux and expose its WebSocket port.
2. Deploy Studio on Linux if you want iframe Workspace support.
3. Prefer HTTPS for the UI and `wss://` for Gateway when the client is not on localhost.
4. Ensure the Windows machine can reach the Linux server.
5. Open firewall and security-group rules for the required ports.
6. Set `.env` remote URLs to the Linux host or reverse-proxy path.
7. Build and run the app.
8. In Settings, switch `Deployment Mode` to `Remote`, or use `Custom` if you want different addresses.
9. Enter the Gateway onboarding token in `Gateway Token` for the first connection.
10. If your Gateway requires manual device approval, approve the new operator device on the server and retry once.

### Option 2A: Windows desktop + Linux server through SSH tunnel

Use this when Gateway or Studio only listens on `127.0.0.1` on the Linux server and cannot be rebound to `0.0.0.0`.

1. Open PowerShell on Windows.
2. Create an SSH local forward to the Linux server:

```powershell
ssh -N -L 18789:127.0.0.1:18789 -L 19000:127.0.0.1:19000 your-user@YOUR_LINUX_HOST
```

3. Keep that terminal window open while using the app.
4. In OpenClaw Center, switch to `Custom` deployment mode.
5. Set:

```text
Gateway URL: ws://127.0.0.1:18789
Studio URL:  http://127.0.0.1:19000
```

6. Test the Gateway connection again from Settings.

Notes:

- If you only need Gateway, you can remove the `-L 19000:127.0.0.1:19000` part.
- If your Linux host exposes SSH on a non-default port, use `ssh -p <port>`.
- This is often the safest approach when the server-side services are intentionally bound to localhost only.

### Linux server checklist

- Gateway must expose the WebSocket endpoint used by the client
- Remote browser clients should use HTTPS/WSS so WebCrypto device signing is available in a secure context
- Studio must expose `/health` and its main page if you want iframe Workspace support
- If Studio is on another origin, it must allow being embedded in an iframe
- Reverse proxy, CSP, and `X-Frame-Options` must not block embedding
- If using HTTPS, make sure certificates are valid on the Windows client

## Gateway authentication notes

- OpenClaw Gateway does not accept the old "open WebSocket and immediately call `gateway.get_status`" flow.
- The client now follows the official handshake: receive `connect.challenge`, send `req/connect`, then persist the paired-device token returned by `hello-ok`.
- `Gateway Token` in Settings is for first connect and token-protected servers. Leave it empty only after the device has already been paired or when the server explicitly allows insecure auth for local development.
- If the server reports a stale paired-device token, the client clears the cached device token and retries with the shared Gateway token automatically.

## Deploy with OpenClaw

If you want OpenClaw to take over the deployment workflow, use the root-level [SKILL.md](./SKILL.md). It is written to guide an OpenClaw agent through the full Linux rollout, including frontend build, production endpoint setup, Nginx reverse proxy, Studio service preparation, and verification from a Windows browser.

Recommended prompt:

```text
Use the deployment skill at ./SKILL.md and complete the Linux deployment for this repository end to end.

Goal:
- Deploy the OpenClaw Center UI on my Linux server
- Keep OpenClaw Gateway and Studio on the same Linux server
- Make the UI operable from my Windows browser

Requirements:
- Prefer same-origin deployment through Nginx
- Build the frontend for remote mode
- Configure Gateway as /gateway/ and Studio as /studio
- Prepare or update all needed files in this repo
- If server access is unavailable, finish all repo-side work and leave exact server commands and config paths
- At the end, give me a verification checklist and the remaining manual steps
```

If you already know your domain, server path, or service user, append them to the same prompt so OpenClaw can fill in the final production values directly.

## Local development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Tauri 2 toolchain

### Install

```bash
npm install
```

### Run web development mode

```bash
npm run dev
```

### Run Tauri desktop mode

```bash
npm run tauri dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## How to use each module

### Chat

- Open the Chat tab
- Create or select a session
- Type a message and press `Enter` to send
- Use `Shift+Enter` for a newline
- Use reply and mention features when needed
- Attach config files such as `USER.md`, `SOUL.md`, and `MEMORY.md`

### Kanban

- Open the Kanban tab
- Create cards in a column
- Edit card title or description
- Move cards across columns
- Resolve conflicts if the server returns a conflict state

### Files

- Open the Files tab
- Browse agent directories
- Select `USER.md`, `SOUL.md`, or `MEMORY.md`
- Use:
  - `Readable` for cleaned-up reading
  - `Outline` for structure and coverage inspection
  - `Raw` for the original content
- Export a copy when needed

### Workspace

- Open the Workspace tab
- If `Studio URL` is reachable, the remote Studio page is embedded automatically
- If not, the app falls back to the built-in local workspace view
- You can disable iframe embedding in Settings if you want to always use fallback mode

### Settings

- Switch between `Local`, `Remote`, and `Custom` deployment modes
- Edit `Gateway URL` and `Studio URL`
- Test Gateway connectivity
- Change theme, language, font size, and compact mode
- Inspect error logs and offline queue
- Export diagnostics

## Notes

- The Files module is not a general-purpose uploader UI. It is intentionally focused on Agent config viewing.
- Studio only supports Chinese and English in this project.
- Some settings-side management features are still local-only until the corresponding remote protocol is documented.
