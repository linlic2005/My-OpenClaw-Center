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