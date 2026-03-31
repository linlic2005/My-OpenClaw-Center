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

- Real WebSocket Gateway connection
- Heartbeat and reconnect
- Offline queue persistence
- Error log persistence
- Settings and chat draft persistence
- Tauri SQL fallback to localStorage

## Current behavior by module

### Fully or mostly remote-capable today

- Chat
- Kanban
- File listing and file export/download for config viewing
- Gateway connection health
- Agent list loading from `gateway.get_agents`

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
3. Ensure the Windows machine can reach the Linux server.
4. Open firewall and security-group rules for the required ports.
5. Set `.env` remote URLs to the Linux host.
6. Build and run the desktop app on Windows.
7. In Settings, switch `Deployment Mode` to `Remote`, or use `Custom` if you want different addresses.

### Linux server checklist

- Gateway must expose the WebSocket endpoint used by the client
- Studio must expose `/health` and its main page if you want iframe Workspace support
- If Studio is on another origin, it must allow being embedded in an iframe
- Reverse proxy, CSP, and `X-Frame-Options` must not block embedding
- If using HTTPS, make sure certificates are valid on the Windows client

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
