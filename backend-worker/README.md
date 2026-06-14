# Cloudflare Workers 后端

这是海龟汤游戏的 Cloudflare Workers 后端版本，接口与 Node/Express 后端保持一致：

- `GET /api/test`
- `POST /api/chat`
- `GET /api/stories/:storyId/bottom`
- `POST /api/stories/:storyId/guess`

## 本地调试

```bash
cd backend-worker
npm install
copy .dev.vars.example .dev.vars
npm run dev
```

`.dev.vars` 只用于本地，不要提交：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
CORS_ORIGIN=http://localhost:5173
```

## 部署到 Cloudflare

先登录 Cloudflare：

```bash
cd backend-worker
npx wrangler login
```

设置密钥和前端域名：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put CORS_ORIGIN
```

`CORS_ORIGIN` 填你的前端地址，例如：

```text
https://你的-vercel-项目.vercel.app
```

部署：

```bash
npm run deploy
```

部署成功后，Cloudflare 会给出 Worker 地址，例如：

```text
https://ai-haigui-game-api.your-name.workers.dev
```

把这个地址填到 Vercel 前端环境变量：

```env
VITE_API_BASE_URL=https://ai-haigui-game-api.your-name.workers.dev
```

注意不要在 `VITE_API_BASE_URL` 后面加 `/api`。
