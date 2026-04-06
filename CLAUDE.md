# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Type-check + production build
npm run lint      # ESLint (zero warnings allowed)
npm run preview   # Preview production build
```

### Backend
```bash
cd server
npm run dev       # Start Express dev server (http://localhost:4000)
npm run build     # TypeScript compile to dist/
npm run start     # Production start (dist/main.js)
npm run test      # vitest
```

### Full-stack dev
```bash
# Terminal 1: backend
cd server && npm run dev
# Terminal 2: frontend (auto-connects to localhost:4000/api)
VITE_API_BASE_URL=http://localhost:4000/api npm run dev
```

## Architecture

**OpenClaw Web Console** — A full-stack application for managing AI agents via an OpenClaw Gateway. The frontend is a React SPA; the backend is a Node.js/Express API server that acts as a secure intermediary to the Gateway.

### Frontend (`src/`)

| Layer | Location | Purpose |
|---|---|---|
| Pages | `src/pages/` | Route-level components (Dashboard, Chat, Agents, Office, Channels, Tasks, Skills, Logs, Settings, Login) |
| Layout | `src/components/layout/` | `MainLayout` wraps all authenticated pages with `Sidebar` + `Header` |
| State | `src/stores/` | Zustand stores — one per domain |
| API | `src/services/api-client.ts` | Axios instance (`VITE_API_BASE_URL`) |
| Types | `src/types/index.ts` | All shared interfaces |
| i18n | `src/stores/i18n.ts` | Flat key→string translation map; EN / ZH / JP |

**Stores:** `useAppStore` (language/theme, persisted), `useAgentStore`, `useChatStore`, `useOfficeStore`, `useNotificationStore`.

**Routing:** All routes except `/login` nested under `MainLayout`. Root `/` redirects to `/dashboard`.

**Styling:** Tailwind CSS, dark/light theme. Radix UI primitives. `lucide-react` icons. `clsx` + `tailwind-merge`.

**Path alias:** `@/` → `src/` (tsconfig + vite).

### Backend (`server/src/`)

| Layer | Location | Purpose |
|---|---|---|
| Entry | `main.ts`, `app.ts` | Bootstrap (DB → Gateway → Express → WS), Express middleware chain |
| Config | `config/` | Zod-validated `.env` loading |
| Modules | `modules/` | Domain modules: auth, agents, chat, office, channels, tasks, skills, settings, logs, health |
| Gateway | `gateway/` | `GatewayAdapter` interface + `MockGatewayAdapter` (swap for `HttpGatewayAdapter` for real Gateway) |
| Realtime | `realtime/` | EventEmitter bus + WebSocket server (`/ws`) with channel subscriptions |
| Audit | `audit/` | Middleware that logs all write operations to `audit_logs` table |
| Shared | `shared/` | Logger (pino), errors, response envelope, zod validator, rate limiter, pagination |
| Database | `database/` | sql.js (SQLite), migrations, seed data |

**Module pattern:** Each module has `*.controller.ts` (routes), `*.service.ts` (logic), `*.types.ts` (DTOs + zod schemas), optionally `*.repository.ts` (DB).

**Auth:** JWT (access 15min + refresh 7d). Roles: `admin`, `viewer`. Middleware: `requireAuth`, `requireRole('admin')`.

**Chat streaming:** `POST /api/chat/sessions/:sid/messages` returns SSE (`text/event-stream`) with `chunk`/`done`/`error` events.

**WebSocket:** `ws://host/ws?token=<jwt>`. Channels: `agents`, `logs`, `office`, `metrics`, `system`, `chat:{sessionId}`.

**Database:** SQLite via sql.js. Tables: `users`, `chat_sessions`, `messages`, `rooms`, `agent_anchors`, `audit_logs`, `settings`. Auto-migrated on startup. Auto-saved to `server/data/openclaw.db` every 30s.

**Gateway isolation:** The backend connects to Gateway via loopback only. Frontend never touches Gateway directly. Gateway credentials stored only in `.env`.

### Key API endpoints

| Endpoint | Description |
|---|---|
| `POST /api/auth/login` | Login (returns JWT) |
| `GET /api/agents` | List agents (from Gateway) |
| `POST /api/chat/sessions/:sid/messages` | Send message (SSE stream) |
| `GET /api/office/rooms` | Office rooms |
| `GET /api/office/agents` | Agent anchor positions |
| `GET /api/logs/stream` | Real-time log SSE |
| `GET /api/health` | Health check (no auth) |
| `GET /api/audit` | Audit log (admin only) |

Default admin credentials: `admin / admin123` (configured in `.env`).
