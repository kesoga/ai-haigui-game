# 后端服务

Express 后端负责代理 AI 请求、保存敏感配置，并强制把 AI 输出收敛为「是」「否」「无关」。

## 启动

```bash
npm ci
copy .env.example .env
npm start
```

默认地址：`http://localhost:3000`

## 环境变量

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
ASK_RETRY_MAX=2
ASK_TIMEOUT_MS=8000
RATE_LIMIT_WINDOW_MS=60000
CHAT_RATE_LIMIT_MAX=30
REVEAL_RATE_LIMIT_MAX=60
```

## 接口

### `GET /`

返回服务状态和可用接口。

### `GET /api/test`

健康检查。

### `POST /api/chat`

请求：

```json
{
  "question": "他还活着吗？",
  "story": {
    "id": "s-001",
    "surface": "大厦停电前，一个人独自进了电梯；来电后，电梯里只剩下一把湿伞。"
  }
}
```

### `POST /api/stories/:storyId/guess`

提交玩家的最终答案，由后端与汤底进行相似度判断。

请求：

```json
{
  "answer": "湿伞是他留下的救援标记"
}
```

响应：

```json
{
  "status": "success",
  "storyId": "s-001",
  "isCorrect": true,
  "similarity": 0.78,
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

### `GET /api/stories/:storyId/bottom`

揭晓汤底。

响应：

```json
{
  "status": "success",
  "storyId": "s-001",
  "bottom": "完整汤底文本",
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

响应：

```json
{
  "status": "success",
  "answer": "无关",
  "isFallback": false,
  "retriesCount": 0,
  "providerResponseValid": true,
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

## 测试

```bash
npm test
```

测试覆盖：
- 严格三值校验
- 请求参数校验
- 后端故事汤底解析
- 最终答案相似度判断
- 基础请求限流
- 无 API Key 时的兜底行为
