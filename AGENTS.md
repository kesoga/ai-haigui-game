# AGENTS.md

## 项目概述
- 项目：AI 海龟汤游戏网站
- 技术栈：React + TypeScript + Tailwind CSS
- 目标：优先交付可玩的核心流程（选题 -> 提问 -> 三值回答 -> 揭晓）

## 开发规范
- 使用 TypeScript，保持完整类型定义与类型安全
- 使用函数式组件 + React Hooks（`useState`、`useContext`、`useEffect` 等）
- 使用 Tailwind CSS 编写样式，避免内联样式和样式分散
- 组件尽量可复用，逻辑与 UI 适度解耦
- 在复杂逻辑处添加简洁注释（说明“为什么”，避免解释显而易见的代码）

## 代码风格
- 组件名：PascalCase（如 `GameCard`）
- 函数名：camelCase（如 `handleSendQuestion`）
- 常量名：UPPER_SNAKE_CASE（如 `MAX_QUESTIONS`）
- 类型名：以 `T` 开头（如 `TStory`、`TMessage`、`TTriAnswer`）

## 设计规范
- 整体风格：神秘悬疑、深蓝色调，主背景优先 `bg-slate-900` / `bg-slate-950`
- 强调色：金色，优先 `text-amber-400`
- 圆角：统一使用 `rounded-lg`
- 阴影：统一使用 `shadow-lg`
- 响应式：优先移动端适配，再增强到平板和桌面

## 功能优先级
- 第一优先：MVP 核心闭环
  - 游戏大厅（选择故事）
  - 游戏页面（展示汤面、提问、历史记录）
  - 结果页面（展示汤底、再来一局）
- 第二优先：稳定性与规则一致性
  - AI 严格三值输出：`是` / `否` / `无关`
  - 非三值响应时重试与兜底

## AI 与安全约束
- 禁止在前端硬编码 API Key
- 所有密钥均通过环境变量注入（如 `DEEPSEEK_API_KEY`）
- 前端仅使用公开配置（如 `VITE_API_BASE_URL`）
- AI 回答必须经过三值校验，不合规时执行兜底策略

## 测试要求
- 每个功能完成后进行手动测试
- 检查不同屏幕尺寸下的显示与交互（移动端优先）
- 验证 AI 回答准确性与格式合规性（仅三值）
- 验证异常场景（超时、接口失败、非三值）下的降级体验

## 实施原则
- 保持代码简洁，避免过度设计
- 先实现最小可用版本，再逐步增强
- 新增代码优先复用现有组件与工具函数

## Cursor Cloud specific instructions

- Node.js 必须满足 Vite 8：`^20.19.0` 或 `>=22.12.0`。当前镜像自带的 Node 22 可以直接使用。
- 依赖安装（仓库根目录，可重复执行）：`npm ci --prefix frontend`、`npm ci --prefix backend`、`npm ci --prefix backend-worker`。
- 本地可玩闭环不依赖 `DEEPSEEK_API_KEY`。不要把 `backend/.env.example` 原样复制成 `backend/.env`：示例里的占位 key 非空，服务会去请求 DeepSeek，而不会走本地启发式兜底。未配置真实 key 时，提问仍会返回「是 / 否 / 无关」，且 `isFallback` 为 true。
- 前端公开配置写在 `frontend/.env`：`VITE_API_BASE_URL=http://127.0.0.1:3000`。浏览器通过该地址访问后端，不走 Vite 代理。
- 开发服务：后端 `HOST=0.0.0.0 PORT=3000 CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173 npm start --prefix backend`（`http://127.0.0.1:3000`）；前端 `npm run dev --prefix frontend -- --host 0.0.0.0 --port 5173`（`http://127.0.0.1:5173`）。
- 核心路径：首页选「雨夜电梯」→ `/game/s-001` → 等汤面打字结束后提问 → 三值回答 → 「查看汤底」→ `/result/:sessionId`。
- 校验命令：`npm test --prefix backend`、`npm run lint --prefix frontend`、`npm run build --prefix frontend`、`npm run check --prefix backend-worker`。

