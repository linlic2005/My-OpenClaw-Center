# OpenClaw Center

OpenClaw Center is a publishable OpenClaw client built with React, TypeScript, and Tauri 2.

This version refactors the project into:

- a `ClawX`-inspired command center shell
- a `Star-Office-UI`-inspired workspace scene
- the existing real OpenClaw Gateway handshake and `agents.list` integration

The goal is simple: connect to a local or remote OpenClaw Gateway, show agent information in a modern control surface, and keep the project clean enough to ship as a GitHub repository.

## Highlights

- Official Gateway connect flow
  Uses `connect.challenge` + `connect`, shared-token auth, paired-device token reuse, reconnect, and heartbeat.
- Agent-first overview
  The new home screen is a mission-control dashboard that surfaces Gateway status, agent roster, deployment mode, queue state, and workspace telemetry.
- Star Office workspace scene
  The Studio area can embed a live Flask Studio page, or fall back to a built-in Star Office style scene view.
- Existing capability modules kept intact
  Chat, Kanban, Config Viewer, Studio, and Settings still work as separate modules under the new shell.
- GitHub-ready project structure
  Includes `.gitignore`, `LICENSE`, publishable package metadata, environment examples, and updated docs.

## Design Direction

This project does not copy upstream repositories verbatim.

It combines ideas from:

- [ValueCell-ai/ClawX](https://github.com/ValueCell-ai/ClawX)
- [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)

The result is an OpenClaw-focused integration layer with:

- a ClawX-style product shell and control flow
- a Star Office style visual workspace
- OpenClaw-specific Gateway connectivity and module logic

## Core Modules

- `Overview`
  Mission-control dashboard for Gateway, agents, workspace scene, and quick entry into feature modules.
- `Chat`
  Gateway-backed chat sessions with history loading, quoted replies, mentions, and config-file references.
- `Kanban`
  Gateway-backed board loading, card create/edit/move/delete, and conflict handling.
- `Configs`
  Focused viewer for `USER.md`, `SOUL.md`, and `MEMORY.md`.
- `Studio`
  Live Studio iframe when available, local Star Office scene fallback otherwise.
- `Settings`
  Connection testing, deployment mode switching, theme/runtime settings, diagnostics, logs, and queue inspection.

## Environment

Copy `.env.example` to `.env` and adjust as needed.

```env
VITE_DEFAULT_DEPLOYMENT_MODE=local
VITE_LOCAL_WS_URL=ws://127.0.0.1:18789
VITE_LOCAL_STUDIO_URL=http://127.0.0.1:19000
VITE_REMOTE_WS_URL=ws://your-linux-server:18789
VITE_REMOTE_STUDIO_URL=http://your-linux-server:19000
VITE_APP_NAME=OpenClaw Center
VITE_APP_VERSION=1.0.0
```

## Local Development

Requirements:

- Node.js 18+
- Rust 1.70+
- Tauri 2 toolchain

Install:

```bash
npm install
```

Run web mode:

```bash
npm run dev
```

Run Tauri mode:

```bash
npm run tauri dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm run test
```

## Gateway Notes

- The client uses the official Gateway-style handshake.
- `Gateway Token` is intended for first-time connection or protected environments.
- After a successful pair, the issued paired-device token is stored locally and reused on reconnect.
- `agents.list` is used to populate the dashboard and Settings agent roster.

## Suggested Repository Layout

- `src/`
  React app, service layer, stores, and UI modules.
- `src-tauri/`
  Tauri host application.
- `studio/`
  Optional Flask-based workspace service.
- `deploy/`
  Deployment references for Linux/systemd/nginx.

## Publishing Checklist

Before pushing to GitHub:

1. Update `README.md` and `README.zh-CN.md` with your final repository URL and screenshots.
2. Fill `.env.example` with the deployment presets you want others to start from.
3. Confirm `npm run build` and `npm run test` succeed.
4. Remove any local-only secrets from `.env`.
5. Commit the new shell, workspace scene, and docs together so the repo reflects the new product direction.

## License

MIT
