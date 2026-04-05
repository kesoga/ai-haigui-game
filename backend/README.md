# 后端服务接口文档

## 项目概述

本后端服务为 AI 海龟汤游戏提供 API 接口，主要功能包括：
- 服务状态检查
- 测试接口
- AI 对话接口（核心功能）

## 技术栈

- Node.js
- Express.js
- CORS
- dotenv

## 环境配置

### 安装依赖

```bash
npm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件，添加以下配置：

```env
# DeepSeek API Key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 环境
NODE_ENV=development
```

## 启动服务

```bash
# 启动开发服务
npm start

# 服务将运行在 http://localhost:3000
```

## API 接口文档

### 1. 服务状态检查

- **路径**: `/`
- **方法**: `GET`
- **描述**: 检查后端服务是否正常运行
- **请求参数**: 无
- **响应格式**:

  ```json
  {
    "message": "Backend server is running!",
    "status": "success",
    "endpoints": {
      "test": "/api/test",
      "chat": "/api/chat"
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 2. 测试接口

- **路径**: `/api/test`
- **方法**: `GET`
- **描述**: 测试后端接口是否正常响应
- **请求参数**: 无
- **响应格式**:

  ```json
  {
    "message": "Hello from backend!",
    "status": "success",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 3. AI 对话接口

- **路径**: `/api/chat`
- **方法**: `POST`
- **描述**: 调用 AI 进行海龟汤游戏对话，返回「是」、「否」或「无关」的回答
- **请求参数**:

  | 参数 | 类型 | 必填 | 描述 |
  |------|------|------|------|
  | question | string | 是 | 用户的问题 |
  | story | object | 是 | 故事对象，包含汤面和汤底 |
  | story.id | string | 是 | 故事ID |
  | story.surface | string | 是 | 汤面（故事的谜面） |
  | story.bottom | string | 是 | 汤底（故事的答案） |

  **请求示例**:
  ```json
  {
    "question": "他是自杀吗？",
    "story": {
      "id": "story1",
      "surface": "一个人在房间里，发现地上有一滩水和一个破碎的玻璃，他突然意识到自己会死",
      "bottom": "这个人是一个冰块雕刻家，他雕刻了一个冰块做的玻璃，当冰块融化后，水和破碎的玻璃出现，他意识到自己在一个没有门的房间里，会被淹死"
    }
  }
  ```

- **响应格式**:

  **成功响应**:
  ```json
  {
    "status": "success",
    "answer": "是",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

  **错误响应**:
  ```json
  {
    "status": "error",
    "message": "缺少必要参数: question 和 story",
    "error": "缺少必要参数: question 和 story",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/chat",
    "method": "POST"
  }
  ```

## 错误处理

后端服务会根据不同的错误类型返回不同的状态码和错误信息：

- **400 Bad Request**: 请求参数错误
- **404 Not Found**: 接口不存在
- **500 Internal Server Error**: 服务器内部错误

## 日志记录

后端服务会记录以下日志：
- 所有请求的详细信息（方法、路径、请求头、请求体）
- 响应状态码和响应时间
- 错误信息和堆栈

## 部署建议

1. **生产环境配置**:
   - 设置 `NODE_ENV=production`
   - 配置具体的前端域名到 CORS 白名单
   - 使用环境变量管理敏感信息

2. **性能优化**:
   - 使用进程管理器（如 PM2）管理服务
   - 配置适当的内存限制
   - 考虑使用负载均衡

3. **安全建议**:
   - 定期更新依赖
   - 使用 HTTPS
   - 实现请求频率限制
   - 对输入参数进行严格验证
