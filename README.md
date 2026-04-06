# OpenClaw Web Console

OpenClaw Web Console 是一个前后端分离的管理平台，用于在不直接暴露 Gateway 管理端口的前提下，通过统一 Web 控制台管理 OpenClaw。

当前仓库已经具备：

- Vite + React 前端控制台
- Express + SQLite 后端 API
- Chat / Agents / Office / Logs / Settings 等基础页面
- Gateway 抽象层，可在 `mock` 和真实 Gateway 之间切换
- 原生嵌入式像素办公室运行时，不使用 iframe

更完整的项目总结见：

- [docs/PROJECT_SUMMARY.md](/C:/Users/linlic/Desktop/Openclaw%20Center/docs/PROJECT_SUMMARY.md)

## 当前进展

当前已完成的重点能力：

- 统一控制台基础信息架构
- Agent 列表、状态与会话管理基础链路
- 聊天页流式回复
- Office 页面原生接入 Phaser 像素办公室运行时
- 办公室内的房间切换、Agent 摆放、点位编辑
- 房间的新建、编辑、删除保护
- 前端按路由和依赖做拆包优化
- **装修工坊**：辅助网页端生图工作流 + 素材管理 + 收藏系统
- **家具互动**：点击植物/海报/猫切帧，咖啡机循环动画
- **气泡系统**：状态气泡 + 猫咪气泡定时弹出
- **打字机状态栏**：底部牌匾显示房间名 + 状态文字逐字显现

当前还未完全收口的部分：

- 与真实 OpenClaw Gateway 的官方 WebUI 级行为对齐
- 更细的房间级布局配置模型
- 生产部署脚本与完整运维文档

## 仓库结构

```text
.
├─ public/
│  ├─ assets/
│  │  ├─ agents/                # Agent 素材
│  │  └─ star-office/           # 办公室运行时素材
│  │     ├─ bg-history/         # 背景替换历史归档
│  │     └─ home-favorites/     # 收藏的背景地图
│  └─ vendor/                   # Phaser vendor 脚本
├─ src/
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ office/
│  │  │  ├─ runtime/            # Phaser 办公室运行时接入层
│  │  │  ├─ AssetDrawer.tsx     # 装修工坊侧边抽屉
│  │  │  ├─ StatusBar.tsx       # 打字机效果底部状态栏
│  │  │  └─ AgentSprite.tsx     # Agent 精灵渲染
│  │  └─ ui/
│  ├─ pages/                    # Dashboard / Chat / Agents / Office / ...
│  ├─ services/
│  ├─ stores/
│  └─ types/
├─ server/
│  ├─ src/
│  │  ├─ modules/
│  │  │  └─ office/
│  │  │     ├─ office.controller.ts    # 房间/锚点 + 装修 API
│  │  │     ├─ office.service.ts       # 房间管理
│  │  │     ├─ decoration.service.ts   # 素材/收藏/背景管理
│  │  │     └─ decoration.types.ts     # 装修模块类型
│  │  ├─ gateway/
│  │  ├─ realtime/
│  │  ├─ database/
│  │  └─ shared/
│  └─ data/openclaw.db
└─ docs/
```

## 本地开发

### 前端

```bash
npm run dev
npm run build
npm run lint
```

### 后端

```bash
cd server
npm run dev
npm run build
npm run test
```

### 联调

先启动后端，再在根目录启动前端：

```bash
VITE_API_BASE_URL=http://localhost:4000/api npm run dev
```

## 关键配置

前端：

- `VITE_API_BASE_URL`

后端：

- `server/.env.example` 复制为 `server/.env`
- `GATEWAY_MODE=mock` 用于本地 UI 开发
- `GATEWAY_MODE=real` 用于接入真实 Gateway
- `GATEWAY_URL` 建议保持为仅服务端可访问地址，例如 `http://127.0.0.1:3000`
- `GATEWAY_TOKEN` 只能保存在服务端环境变量，不能下发到浏览器
- `DECORATION_DRAWER_PASS` 装修工坊验证码（默认 `1234`）

## 验证命令

前端最低验证：

```bash
npm run build
npm run lint
```

后端最低验证：

```bash
cd server
npm run build
npm run test
```

## 部署原则

- 前端、后端、OpenClaw、Gateway 部署在同一台 Linux 服务器
- 公网只暴露统一 Web 控制台入口
- Gateway 管理端口只允许内网或本机访问
- 反向代理转发 `/`、`/api` 和 `/ws`
- JWT、Gateway Token 等敏感信息只保存在服务端环境变量

## 当前办公室实现说明

办公室页不是 iframe 拼接，而是：

- React 页面负责控制台外壳和管理面板
- Phaser 负责像素办公室场景运行时
- Zustand store 与现有 `/office/*`、`/agents`、`/chat` 数据流联动

对应核心文件：

- [src/pages/Office.tsx](src/pages/Office.tsx) — 办公室主页面
- [src/components/office/runtime/OfficeRuntime.tsx](src/components/office/runtime/OfficeRuntime.tsx) — Phaser 场景引擎
- [src/components/office/AssetDrawer.tsx](src/components/office/AssetDrawer.tsx) — 装修工坊侧边抽屉
- [src/components/office/StatusBar.tsx](src/components/office/StatusBar.tsx) — 打字机状态栏
- [server/src/modules/office/decoration.service.ts](server/src/modules/office/decoration.service.ts) — 后端装修服务
- [server/src/modules/office/office.controller.ts](server/src/modules/office/office.controller.ts) — 后端路由控制器

### 装修工坊使用流程

1. 在办公室页点击「装修」按钮打开侧边栏
2. 输入验证码进入（默认 `1234`，可通过 `DECORATION_DRAWER_PASS` 环境变量修改）
3. 在「装修」标签页中：
   - **下载参考模板** — 获取房间结构参考图
   - **复制 Prompt** — 选择一个推荐主题并复制 Prompt
   - 前往网页版 Gemini（Nano Banana / Flow）粘贴 Prompt + 附上参考图生成新背景
   - **上传背景** — 将生成的图片上传，背景立即替换
4. 在「素材」标签页中可替换/恢复任意美术素材
5. 在「收藏」标签页中可收藏和管理背景地图

## 备注

当前仓库仍处于持续迭代阶段。若要继续推进，优先建议顺序是：

1. 完成真实 Gateway 行为对齐
2. 收敛 Office 场景配置模型
3. 补齐部署与运维文档
4. 增强端到端测试和安全校验
