# AI 海龟汤游戏网站

一个基于 AI 主持的文字推理游戏。玩家选择故事后，通过连续提问推理真相；AI 主持只允许回答「是」「否」「无关」。

## 项目结构

```text
ai-haigui-game-master/
  frontend/   React + TypeScript + Vite + Tailwind CSS
  backend/    Node.js + Express + DeepSeek API proxy
```

## 快速开始

### 1. 启动后端

```bash
cd backend
npm ci
copy .env.example .env
npm start
```

在 `backend/.env` 中配置：

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
DEEPSEEK_API_KEY=your_deepseek_api_key
RATE_LIMIT_WINDOW_MS=60000
CHAT_RATE_LIMIT_MAX=30
```

如果暂时没有 `DEEPSEEK_API_KEY`，后端会返回兜底答案「无关」，方便本地页面流程继续跑通。

### 2. 启动前端

```bash
cd frontend
npm ci
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)。

## 常用命令

```bash
# 后端
cd backend
npm test
npm start

# 前端
cd frontend
npm run dev
npm run build
npm run lint
```

## 当前能力

- 游戏大厅：按难度展示故事卡片
- 游戏页：展示汤面、对话历史、提问次数和最终答案输入
- AI 问答：后端代理 AI 调用，并强制校验「是 / 否 / 无关」
- 汤底揭晓：通过后端接口加载故事真相，并展示推理轨迹
- 本地持久化：使用 `localStorage` 保存会话

## 安全说明

- 不要把 `backend/.env` 提交到仓库。
- AI API Key 只放在后端环境变量中。
- `/api/chat` 会优先按 `story.id` 在后端查找汤底，前端提问请求不发送完整汤底。
- `/api/stories/:storyId/bottom` 用于揭晓汤底，故事答案不再打包进前端公开数据。

## 部署

- 前端：GitHub Pages / Vercel / Netlify 均可部署静态产物。
- 后端：Railway / Render / Fly.io / 任意 Node.js 服务均可。
- 生产环境务必配置 `CORS_ORIGIN` 为真实前端域名。

## License

[MIT](./LICENSE)
