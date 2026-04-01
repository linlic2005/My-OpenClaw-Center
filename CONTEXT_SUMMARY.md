# OpenClaw Center Context Summary

Last updated: 2026-04-01

## Product constraints

- File module is not a general uploader.
- File module is for viewing Agent config files, especially `USER.md`, `SOUL.md`, and `MEMORY.md`.
- Studio only supports Chinese and English. Do not add Japanese.
- Prefer direct implementation over giving plans only.
- Keep deployment documentation synchronized between `README.md` and `README.zh-CN.md`.

## Current project state

- Frontend stack: React + TypeScript + Tauri 2
- Build status: `npx tsc --noEmit` passes, `npm run build` passes
- Real Gateway skeleton is already in place
- Studio Flask iframe + local fallback is already in place
- Browser-based deployment is viable; Tauri is not required for remote UI access

## Deployment constraints

- Prefer same-origin deployment behind a reverse proxy:
  - UI at `/`
  - Gateway WebSocket at `/gateway/`
  - Studio at `/studio`
- `Chat`, `Kanban`, and `Files` depend on Gateway connectivity.
- `Workspace` iframe depends on Studio availability and must keep the local fallback working.
- Deployment templates and guidance now live in:
  - `SKILL.md`
  - `deploy/linux/README.zh-CN.md`
  - `deploy/linux/.env.production.example`
  - `deploy/linux/nginx/openclaw-center.conf`
  - `deploy/linux/systemd/openclaw-studio.service`
  - `deploy/linux/systemd/openclaw-studio.env.example`
- Do not assume raw public exposure of `18789` and `19000` is the preferred production topology; same-origin reverse proxy is the default target.
- Do not assume Studio is mandatory for the whole app to function; only Workspace embed depends on it.

## Current Gateway / deployment findings

- The Gateway in the current environment is OpenClaw Gateway, not a generic unauthenticated WebSocket mock.
- The local OpenClaw config currently uses `gateway.auth.mode = token`; do not write secrets into repo files or docs.
- The local Gateway can emit `connect.challenge` immediately after WebSocket connect, so the frontend must not assume `gateway.get_status` works before authentication/handshake.
- Operator-facing RPC may require approved scopes such as `operator.read`; do not assume all paired tokens can call all methods.
- Current API material documents core RPCs like `gateway.get_agents`, but does not clearly document skill install/uninstall/enable/disable or channel CRUD. Do not invent undocumented Gateway methods.

## Completed work

### Gateway and persistence

- `src/services/GatewayService.ts`
  - Real WebSocket connection
  - request/response matching
  - push subscription
  - heartbeat
  - reconnect
  - offline queue
- `src/services/PersistenceService.ts`
  - Tauri SQL fallback to localStorage
  - settings/chat drafts/chat sessions/offline queue/error logs persistence

### Chat

- `src/components/chat/ChatModule.tsx`
  - session search
  - Enter to send
  - Shift+Enter newline
  - quote reply
  - config-file attachments
- `src/services/ChatService.ts`
  - supports `mentions`, `replyTo`, `attachments`
- `src/stores/chatStore.ts`
  - draft persistence wired

### Kanban

- `src/components/kanban/KanbanModule.tsx`
  - quick create
  - edit
  - cross-column move
  - conflict actions
- `src/services/KanbanService.ts`
  - create/update/delete/move/resolve conflict

### File / Config viewer

- `src/components/file/FileModule.tsx`
  - now treated as Agent config viewer
  - focuses on `USER.md`, `SOUL.md`, `MEMORY.md`
  - supports export copy
- `src/stores/fileStore.ts`
  - reduced to load/select/export path

### Settings

- `src/components/settings/SettingsModule.tsx`
  - Gateway connection section
  - language/theme/font size/compact mode
  - notifications/runtime
  - channels local management
  - skills local status management
  - data management panel
  - error log list
  - offline queue preview
  - About section
- `src/stores/settingsStore.ts`
  - connection failure state
  - data management refresh
  - local skill preferences

### Studio

- `src/components/studio/StudioModule.tsx`
  - Flask iframe when available
  - local pixel fallback when unavailable
  - CN/EN only

## Important confirmed boundary

- `C:\Users\linlic\Downloads\TaiziDesktop_Project\API.md` clearly documents `gateway.get_agents`
- The current API doc does not clearly document skill install/uninstall/enable/disable Gateway methods
- The current API doc also does not clearly document channel CRUD Gateway methods
- Do not invent undocumented Gateway methods unless the user explicitly asks for placeholders

## Current P1 completion

Completed:

- settings data management visualization
- connection failure feedback
- dangerous action confirmations
- chat config attachments
- font size setting applied globally
- about panel

Still pending / reasonable next steps:

1. Better Agent config viewer follow-up polish
   - compare same config across agents if needed later
   - richer Gateway-provided metadata when protocol exposes it
2. If future docs expose protocol:
   - real skill install/uninstall/enable/disable
   - real channel CRUD

## Newly completed in this round

- Settings error log management depth
  - log level/module filtering
  - log detail panel
  - single-log export/copy
- File / Config viewer readability upgrade
  - richer config metadata summary
  - readable / outline / raw viewing modes
  - template-style structure coverage checks for USER.md / SOUL.md / MEMORY.md
- Deployment adaptation
  - supports local / remote / custom deployment modes
  - Gateway URL and Studio URL are both configurable in Settings
  - Workspace no longer assumes localhost-only Studio
  - README rewritten with features, deployment, and module usage

## Files changed recently

- `src/App.tsx`
- `src/components/chat/ChatModule.tsx`
- `src/components/file/FileModule.tsx`
- `src/components/settings/SettingsModule.tsx`
- `src/index.css`
- `src/services/ChatService.ts`
- `src/services/PersistenceService.ts`
- `src/services/SettingsService.ts`
- `src/stores/chatStore.ts`
- `src/stores/settingsStore.ts`
- `src/types/index.ts`

## Recommended next task

Implement P1 log management depth:

- error log detail drawer/panel
- log level/module filtering
- single log export / copy
- keep build green after changes
