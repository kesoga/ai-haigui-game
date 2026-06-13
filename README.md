# AI 海龟汤游戏网站

一个基于 AI 主持的文字推理游戏。玩家选择故事后，通过连续提问推理真相，AI 主持只允许回答“是”“否”“无关”。

## 项目结构

```text
ai-haigui-game-master/
  frontend/   React + TypeScript + Vite + Tailwind CSS
  backend/    Node.js + Express + DeepSeek API proxy
```

## 本地启动

### 1. 启动后端

```bash
cd backend
npm ci
copy .env.example .env
npm start
```

在 `backend/.env` 中配置：

```env
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://localhost:5173
DEEPSEEK_API_KEY=your_deepseek_api_key
APP_PASSWORD=change_this_shared_password
```

### 2. 启动前端

```bash
cd frontend
npm ci
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)。

## Vercel 前端部署

仓库根目录已经包含 `vercel.json`，从 Vercel 导入 GitHub 仓库时可以直接部署前端：

- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

前端部署到 Vercel 后，需要在 Vercel 项目的 Environment Variables 中添加：

```env
VITE_API_BASE_URL=https://你的后端部署地址
```

例如后端部署到 Render：

```env
VITE_API_BASE_URL=https://ai-haigui-game.onrender.com
```

后端也要允许 Vercel 前端域名访问：

```env
CORS_ORIGIN=https://你的-vercel-项目.vercel.app
```

注意：`VITE_API_BASE_URL` 是公开的后端地址，不是密钥。`DEEPSEEK_API_KEY` 和 `APP_PASSWORD` 只放在后端环境变量中，不能放到前端或 GitHub。

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

## 安全说明

- 不要提交 `backend/.env`。
- AI API Key 只放在后端环境变量中。
- 前端只保存公开配置，例如 `VITE_API_BASE_URL`。
- 如果开启 `APP_PASSWORD`，用户需要先输入访问密码，才能调用后端 AI 接口。

## License

[MIT](./LICENSE)
