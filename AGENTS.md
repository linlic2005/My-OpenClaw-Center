# Repository Guidelines

## Project Structure & Module Organization
This repository is split into a Vite frontend and an Express backend.

- `src/`: React UI, route pages in `src/pages/`, shared layout in `src/components/`, Zustand stores in `src/stores/`, API helpers in `src/services/`, shared types in `src/types/`.
- `public/assets/`: static images and agent artwork.
- `server/src/`: backend entrypoints (`main.ts`, `app.ts`), domain modules under `modules/`, gateway adapters in `gateway/`, realtime code in `realtime/`, shared helpers in `shared/`, and SQLite setup in `database/`.
- `server/data/openclaw.db`: local development database file.

## Build, Test, and Development Commands
Frontend commands run from the repository root:

- `npm run dev`: start the Vite app on `http://localhost:5173`
- `npm run build`: TypeScript build plus production bundle
- `npm run lint`: ESLint with zero warnings allowed
- `npm run preview`: serve the production build locally

Backend commands run from `server/`:

- `npm run dev`: start the Express server on `http://localhost:4000`
- `npm run build`: compile backend TypeScript to `server/dist/`
- `npm run start`: run the compiled server
- `npm run test`: run Vitest

For full-stack development, run the backend first, then start the frontend with `VITE_API_BASE_URL=http://localhost:4000/api npm run dev`.

## Coding Style & Naming Conventions
Use TypeScript everywhere, keep `strict`-mode clean, and preserve the existing 2-space indentation, semicolons, and single quotes. React components and pages use PascalCase filenames such as `Dashboard.tsx`; hooks and Zustand stores use `useXxx` names. Backend modules follow `*.controller.ts`, `*.service.ts`, `*.types.ts`, and `*.repository.ts`. Use the `@/` alias for frontend imports from `src/`.

## Testing Guidelines
Backend testing is set up with Vitest via `server/package.json`. Add backend specs as `*.test.ts` files close to the code they cover or under a dedicated `server/tests/` folder. The frontend currently has no committed test runner, so at minimum verify UI changes with `npm run build` and `npm run lint`.

## Commit & Pull Request Guidelines
The current Git history uses short, summary-style subjects. Keep commits focused and descriptive, preferably one concern per commit. Pull requests should include a concise description, affected areas (`src/`, `server/`, database, realtime), manual test steps, and screenshots for UI changes. Call out config or schema changes explicitly.

## Configuration & Data
Frontend API access is driven by `VITE_API_BASE_URL`. Backend runtime settings are validated in `server/src/config/schema.ts`; keep new environment variables in that schema. Do not commit secrets. Treat `server/data/openclaw.db` as local state and avoid unrelated database churn in feature PRs.

项目名称：OpenClaw Web Console

目标：
我要开发一个可部署到 Linux 服务器并可通过域名公网访问的 Web 管理平台，用来管理我的 OpenClaw。

硬性要求：
1. 主体界面和核心交互风格参考并尽量复用 https://github.com/ValueCell-ai/ClawX 的 Web/桌面前端信息架构与视觉风格。
2. 在这个主界面的基础上，丝滑嵌入 https://github.com/ringhyacinth/Star-Office-UI 的“办公室可视化”功能，不要做割裂式 iframe 拼接，要求它看起来像同一个产品。
3. 未来部署方式是：前端、后端、OpenClaw、Gateway 都部署在同一台 Linux 服务器上，通过一个域名公网访问。
4. 必须保证 Gateway 连接正确，实现接近 OpenClaw 官方 WebUI 的连接效果：
   - 可以查看全部 agents
   - 可以查看 agent 状态
   - 可以和任意 agent 对话
   - 支持流式回复
   - 支持会话/history
5. 不能把 Gateway 管理端口直接裸露到公网，公网暴露的是我自己的 Web 管理平台。
6. 需要兼顾未来可维护性、可测试性、可部署性和安全性。

业务目标：
- 一个统一控制台
- 一个聊天中心
- 一个 Agent 管理页
- 一个 Office 可视化页
- 一个 Channels 管理页
- 一个 Cron/Tasks 管理页
- 一个 Skills 管理页
- 一个 Settings/Config 页
- 一个 Logs/Health 页

交付要求：
- 前后端代码结构清晰
- 类型完整
- 尽量写可维护代码，不要堆一次性脚本
- 每一步都要输出变更说明
- 不要只做 demo，要按可上线项目的标准来设计