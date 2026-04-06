# OpenClaw Web Console 项目总结

## 1. 项目定位

OpenClaw Web Console 的目标不是做一个演示页，而是做一个可以部署到 Linux 服务器、通过单一域名对外访问的 OpenClaw 管理平台。

核心要求：

- 对外只暴露自建控制台，不直接暴露 Gateway 管理端口
- 支持统一控制台、聊天中心、Agent 管理、Office 可视化、Channels、Tasks、Skills、Settings、Logs/Health
- 办公室可视化原生融入产品，不做割裂式 iframe 拼接
- 兼顾可维护性、可测试性、可部署性和安全性

## 2. 当前技术架构

### 前端

- 技术栈：Vite、React 18、TypeScript、Tailwind、Zustand
- 路由：`react-router-dom`
- 数据访问：`axios`
- Markdown 渲染：`react-markdown` + `remark-gfm`
- 代码高亮：`react-syntax-highlighter`，已做按需语言注册

目录约定：

- `src/pages/`：业务页面
- `src/components/`：布局、UI、办公室运行时等组件
- `src/stores/`：Zustand 状态管理
- `src/services/`：API 与实时能力
- `src/types/`：共享类型

### 后端

- 技术栈：Express、TypeScript、Vitest、SQLite
- 数据库：`server/data/openclaw.db`
- 模块分层：
  - `modules/`：业务模块
  - `gateway/`：Gateway 抽象与适配
  - `realtime/`：WebSocket / 实时事件
  - `database/`：迁移、连接、种子
  - `shared/`：错误、响应、日志、校验

## 3. 当前业务能力

### 已具备

- 登录与鉴权基础能力
- Agent 列表与状态展示
- Chat 会话管理
- SSE 流式回复
- Office 可视化页面
- 房间与 Agent 点位管理
- 基础日志、配置、任务、技能页面框架

### Office 页当前状态

办公室模块已经从“普通 DOM 背景图页面”升级成“React + Phaser 的原生嵌入式运行时”。

当前结构：

- React 负责控制台外壳、工具栏、房间管理、Agent 管理面板
- Phaser 负责像素办公室场景渲染、环境动画、角色呈现
- `Zustand + API` 负责把 agents / chat / office anchors 联通起来

核心文件：

- `src/pages/Office.tsx`
- `src/components/office/runtime/OfficeRuntime.tsx`
- `src/components/office/runtime/officeSceneConfig.ts`
- `src/components/office/runtime/loadPhaser.ts`

## 4. 本阶段已完成的关键工作

### 4.1 办公室运行时接入

已完成：

- 引入 Phaser runtime
- 引入 Star-Office 关键素材
- 使用独立 runtime 组件承载场景
- 按房间背景重建办公室场景
- 基于 agent 状态驱动办公室主状态
- 基于聊天流式状态驱动同步动画
- 办公室场景中支持选中 agent

### 4.2 Agent 点位管理

已完成：

- Agent 放置到房间
- idle / work / sleep 三组锚点配置
- 右侧面板直接编辑点位
- 保存后写回 `/api/office/agents/:agentId`

### 4.3 房间管理

已完成：

- 新建房间
- 编辑房间名称、背景、类型
- 删除房间
- 删除保护：
  - `public` 房间不可删除
  - 仍有 agent 占用的房间不可删除
  - 不存在的房间更新/删除会返回明确错误

对应后端实现：

- `server/src/modules/office/office.service.ts`

### 4.4 打包优化

已完成：

- `Office` 路由懒加载
- `manualChunks` 拆分前端大包
- Markdown 和代码高亮依赖拆分
- 代码高亮只注册常见语言，避免整包 Prism 语言集进入主包

对应文件：

- `src/App.tsx`
- `vite.config.ts`
- `src/pages/Chat.tsx`

## 5. 当前验证结果

最近一轮验证已通过：

前端：

```bash
npm run build
npm run lint
```

后端：

```bash
cd server
npm run build
npm run test
```

测试结果：

- 前端构建通过
- 前端 ESLint 通过
- 后端 TypeScript 构建通过
- 后端 Vitest 通过

## 6. 当前已知边界

虽然项目已经具备较完整的控制台雏形，但仍有几个重要边界没有完全收口：

- Gateway 与 OpenClaw 官方 WebUI 行为还没有做到完全一致
- Office 场景配置还主要停留在房间元数据和 agent 点位层
- 素材抽屉、场景编辑器、布局参数化还未完整移植
- 生产部署文档还需要更细的 systemd / Nginx / 安全策略说明
- 前端页面间的数据契约还可以继续收敛

## 7. 下一阶段建议

建议继续按下面顺序推进：

### 第一优先级

- 完成真实 Gateway 链路对齐
- 补齐 agent 状态、会话、历史、流式行为的正式协议

### 第二优先级

- 引入房间级场景配置模型
- 将背景、布局、环境参数从硬编码配置抽离

### 第三优先级

- 补充 Office 编辑器
- 做素材管理、布局微调、持久化场景配置

### 第四优先级

- 补充部署文档、故障处理文档、备份恢复文档
- 增加更多自动化测试与安全检查

## 8. 结论

截至当前版本，OpenClaw Web Console 已经不是一个静态 demo，而是一个具备前后端结构、基础测试、办公室可视化运行时、房间管理能力和流式聊天链路的可持续演进项目。

它距离“最终可上线版本”还有明确的收尾工作，但基础架构、模块边界和核心体验路径已经建立完成，后续可以继续围绕 Gateway 对齐、Office 场景配置、部署与安全三条主线推进。
