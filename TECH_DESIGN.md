# AI海龟汤游戏技术设计

## 1. 目标与范围
本设计用于支撑 PRD v1.1 的 MVP 实现，聚焦以下目标：
- 支持完整游戏闭环：大厅 -> 游戏 -> 汤底 -> 再来一局
- AI 问答严格三值输出：`是` / `否` / `无关`
- 支持重试与兜底策略，确保稳定性与可观测性
- 前期可纯前端模拟，后续平滑切换到 Express 后端

## 2. 技术栈
- 前端：React + TypeScript + Vite
- 样式：Tailwind CSS
- 状态管理：React Hooks（`useState`、`useContext`）
- 路由：React Router
- 后端：Node.js + Express（可选，前期可用前端模拟）
- AI API：DeepSeek（通过服务端代理调用）

## 3. 架构方案

### 3.1 分层架构
1. **UI 层（React 页面）**
   - 页面：`LobbyPage`、`GamePage`、`BottomPage`
   - 组件：聊天区、输入区、游戏卡片、进度提示等
2. **状态层（Context + Hooks）**
   - `GameSessionContext`：会话状态、问答记录、会话配置
   - `useGameSession`：封装提问、结束、揭晓等行为
3. **服务层（API Client）**
   - `gameApi.ts`：统一接口请求
   - 前期可切到 `mockApi.ts`（本地模拟）
4. **后端层（Express，可选）**
   - 路由层：`/games`、`/game-sessions`、`/ask`、`/bottom`
   - 领域层：会话管理、规则校验、重试兜底
   - Provider Adapter：封装 DeepSeek 调用

### 3.2 前后端部署建议
- 前端：Vercel 静态部署
- 后端：Vercel Serverless / 独立 Node 服务
- 前后端通过 `VITE_API_BASE_URL` 配置联通

## 4. 前端设计

### 4.1 页面与路由
- `/`：游戏大厅
- `/game/:sessionId`：游戏页面
- `/bottom/:sessionId`：汤底页面

### 4.2 核心状态模型（前端）
```ts
type TriAnswer = "是" | "否" | "无关";

interface AskRecord {
  id: string;
  question: string;
  answer: TriAnswer;
  timestamp: string;
  retriesCount: number;
}

interface GameSessionState {
  sessionId: string;
  gameId: string;
  soupPrompt: string;
  maxQuestions: number;
  askedCount: number;
  isBottomRevealed: boolean;
  records: AskRecord[];
}
```

### 4.3 状态管理策略
- `GameSessionContext` 维护当前会话状态
- 页面刷新后可从后端拉取会话恢复（若接后端）
- 前期纯前端可使用 `localStorage` 临时持久化

### 4.4 交互规则
- 发送问题前校验：空字符串不可提交
- 请求中禁用发送按钮，防止重复提交
- 若剩余问题数 <= 5，展示提醒文案
- 统一错误提示：网络异常、服务超时、限流等

## 5. 后端设计（Express）

### 5.1 API 设计
1. `GET /api/games`
   - 返回游戏列表
2. `POST /api/game-sessions`
   - 创建会话，返回 `sessionId`、`soupPrompt`、`maxQuestions`
3. `POST /api/game-sessions/:sessionId/ask`
   - 入参：`question`
   - 出参：`answer`、`askedCount`、`retriesCount`、`timestamp`
4. `GET /api/game-sessions/:sessionId/bottom`
   - 返回汤底、结论、推理轨迹、是否已揭晓

### 5.2 三值校验与兜底
- 校验函数：
  - 仅接受字符串全等：`是`、`否`、`无关`
- 重试策略：
  - Provider 返回不合规或超时时，最多重试 `N=2`（可配置）
- 兜底策略：
  - 重试失败则返回 `无关`
  - 记录 `providerResponseRaw`（建议脱敏或采样）

### 5.3 一致性策略（confirmedFacts）
- 维护 `confirmedFacts[]`，降低前后矛盾
- 若本次结论与既有事实冲突：
  - 记录冲突事件
  - 优先历史事实（MVP 策略）

## 6. 数据模型建议
```ts
interface GameSessionEntity {
  sessionId: string;
  gameId: string;
  createdAt: string;
  status: "active" | "ended" | "revealed";
  soupPrompt: string;
  maxQuestions: number;
  askedCount: number;
  askedList: Array<{
    question: string;
    answer: "是" | "否" | "无关";
    timestamp: string;
    retriesCount: number;
    providerResponseRaw?: string;
  }>;
  confirmedFacts: Array<{
    factText: string;
    confirmedAt: string;
  }>;
  retriesCountTotal: number;
  isBottomRevealed: boolean;
  bottom: {
    fullBottomText: string;
    finalConclusion: string;
    revealedAt?: string;
  };
}
```

## 7. 安全与配置

### 7.1 API Key 管理
- **不要在前端代码中硬编码 API Key**
- 使用环境变量：
  - 前端：仅放公开配置，如 `VITE_API_BASE_URL`
  - 后端：`DEEPSEEK_API_KEY`
- 你的当前 Key 已暴露在聊天文本中，建议立刻在服务商后台轮换（rotate）并停用旧 Key

### 7.2 环境变量示例
```bash
# frontend .env
VITE_API_BASE_URL=http://localhost:3000/api

# backend .env
PORT=3000
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_new_key_here
ASK_RETRY_MAX=2
ASK_TIMEOUT_MS=8000
```

## 8. 可观测性与埋点
- 必采事件：
  - `question_submitted`
  - `answer_returned`
  - `session_created`
  - `bottom_revealed`
- 核心指标：
  - 三值合规率
  - 重试率
  - 兜底率
  - 响应时延 p50/p95
  - 错误率（4xx/5xx）

## 9. 开发阶段建议

### 阶段 1：前端可玩版本（Mock）
- 完成三页面、路由、基础状态管理
- 使用 `mockApi` 模拟三值回复与历史记录

### 阶段 2：接入后端
- 完成 Express API 与会话模型
- 对接真实 `/ask`，加入重试兜底

### 阶段 3：稳定性与上线
- 埋点、告警、限流、错误码与友好提示完善
- 压测与性能优化，满足 p95 < 5s

## 10. 风险与规避
- **风险：AI 返回非三值**
  - 规避：严格校验 + 重试 + 兜底
- **风险：密钥泄露**
  - 规避：服务端代理 + 环境变量 + Key 轮换
- **风险：长会话前后矛盾**
  - 规避：confirmedFacts + 冲突日志
- **风险：接口超时体验差**
  - 规避：超时控制、降级提示、限流与重试策略

