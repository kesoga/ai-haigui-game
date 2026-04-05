# AI 海龟汤游戏项目架构图

## 整体架构

```mermaid
graph TB
    subgraph "前端应用 (React + TypeScript + Vite)"
        subgraph "路由层 (React Router)"
            HomePage[首页 /]
            LobbyPage[游戏大厅 /lobby]
            GamePage[游戏页面 /game/:id]
            BottomPage[汤底页面 /bottom/:id]
            ResultPage[结果页面 /result/:sessionId]
            NotFoundPage[404页面]
        end
        
        subgraph "组件层"
            GameCard[游戏卡片]
            ChatBox[聊天框]
            Message[消息组件]
        end
        
        subgraph "状态管理层 (Context API)"
            GameSessionContext[游戏会话上下文]
        end
        
        subgraph "服务层"
            api[AI API服务]
            mockApi[模拟API服务]
        end
        
        subgraph "数据层"
            LocalStorage[本地存储]
            stories[故事数据]
        end
        
        subgraph "类型定义"
            gameTypes[游戏类型定义]
        end
    end
    
    subgraph "外部服务"
        DeepseekAI[Deepseek AI API]
    end
    
    HomePage --> LobbyPage
    LobbyPage --> GamePage
    GamePage --> ResultPage
    GamePage --> BottomPage
    
    GamePage --> GameSessionContext
    ResultPage --> GameSessionContext
    
    GameSessionContext --> LocalStorage
    GameSessionContext --> api
    GameSessionContext --> stories
    
    api --> DeepseekAI
    
    LobbyPage --> GameCard
    GamePage --> ChatBox
    ChatBox --> Message
    
    GameSessionContext --> gameTypes
```

## 技术栈架构

```mermaid
graph LR
    subgraph "技术栈"
        React[React 19.2.4]
        TypeScript[TypeScript 5.9.3]
        Vite[Vite 8.0.1]
        Tailwind[Tailwind CSS 4.2.2]
        Router[React Router 7.13.2]
    end
    
    React --> Router
    React --> Tailwind
    Vite --> React
    Vite --> TypeScript
```

## 数据流架构

```mermaid
sequenceDiagram
    participant User as 用户
    participant Component as 组件
    participant Context as GameSessionContext
    participant API as API服务
    participant AI as Deepseek AI
    participant Storage as LocalStorage
    
    User->>Component: 选择故事
    Component->>Context: ensureSession(sessionId, storyId)
    Context->>Storage: 保存会话状态
    
    User->>Component: 提问
    Component->>Context: askQuestion(sessionId, storyId, question)
    Context->>API: askAI(question, story)
    API->>AI: 发送请求
    AI-->>API: 返回回答
    API-->>Context: 验证回答
    Context->>Storage: 更新会话状态
    Context-->>Component: 返回结果
    Component-->>User: 显示回答
    
    User->>Component: 查看汤底
    Component->>Context: revealBottom(sessionId)
    Context->>Storage: 更新汤底状态
    Component->>Component: 跳转到结果页
    
    User->>Component: 再来一局
    Component->>Context: resetSession(sessionId)
    Context->>Storage: 删除会话数据
    Component->>Component: 返回大厅
```

## 目录结构

```
ai-haigui-game/
├── frontend/                          # 前端项目
│   ├── public/                        # 静态资源
│   ├── src/
│   │   ├── components/                # 可复用组件
│   │   │   ├── ChatBox.tsx           # 聊天框组件
│   │   │   ├── GameCard.tsx          # 游戏卡片组件
│   │   │   └── Message.tsx           # 消息组件
│   │   ├── constants/                 # 常量定义
│   │   │   └── stories.ts            # 故事数据
│   │   ├── contexts/                  # React Context
│   │   │   └── GameSessionContext.tsx # 游戏会话管理
│   │   ├── pages/                     # 页面组件
│   │   │   ├── HomePage.tsx          # 首页
│   │   │   ├── LobbyPage.tsx         # 游戏大厅
│   │   │   ├── GamePage.tsx          # 游戏页面
│   │   │   ├── BottomPage.tsx        # 汤底页面
│   │   │   ├── ResultPage.tsx        # 结果页面
│   │   │   └── NotFoundPage.tsx      # 404页面
│   │   ├── services/                  # API服务
│   │   │   ├── api.ts                # AI API
│   │   │   └── mockApi.ts            # 模拟API
│   │   ├── types/                     # TypeScript类型
│   │   │   └── game.ts               # 游戏类型定义
│   │   ├── App.tsx                   # 根组件
│   │   ├── main.tsx                  # 入口文件
│   │   └── router.tsx                # 路由配置
│   ├── package.json                   # 项目配置
│   ├── vite.config.ts                 # Vite配置
│   └── tailwind.config.js            # Tailwind配置
├── AGENTS.md                          # 开发规范
├── PRD.md                             # 产品需求文档
└── TECH_DESIGN.md                     # 技术设计文档
```

## 核心功能模块

### 1. 游戏会话管理 (GameSessionContext)
- **职责**: 管理游戏会话状态
- **功能**:
  - 创建和初始化会话
  - 处理用户提问
  - 验证AI回答
  - 揭晓汤底
  - 重置会话
- **数据存储**: LocalStorage

### 2. 路由管理 (React Router)
- **首页**: 游戏介绍和开始按钮
- **游戏大厅**: 故事列表展示
- **游戏页面**: 汤面展示和问答交互
- **结果页面**: 汤底揭晓和游戏历史
- **汤底页面**: 汤底内容展示

### 3. AI集成
- **API**: Deepseek AI
- **回答验证**: 严格限制为「是」「否」「无关」
- **重试机制**: 非规范回答时的降级处理
- **超时处理**: 网络异常时的错误提示

### 4. UI组件
- **GameCard**: 故事卡片，展示故事信息
- **ChatBox**: 聊天界面，包含消息列表和输入框
- **Message**: 单条消息，支持用户和AI两种角色

## 状态管理架构

```mermaid
graph TB
    subgraph "状态层级"
        LocalStorage[LocalStorage持久化]
        ContextState[Context状态]
        ComponentState[组件状态]
    end
    
    ComponentState --> ContextState
    ContextState --> LocalStorage
    LocalStorage --> ContextState
    ContextState --> ComponentState
```

## API架构

```mermaid
graph LR
    subgraph "前端"
        Component[组件]
        Context[GameSessionContext]
    end
    
    subgraph "服务层"
        api[api.ts]
        mockApi[mockApi.ts]
    end
    
    subgraph "外部API"
        Deepseek[Deepseek AI API]
    end
    
    Component --> Context
    Context --> api
    Context --> mockApi
    api --> Deepseek
```

## 安全架构

```mermaid
graph TB
    subgraph "安全层"
        EnvVars[环境变量]
        APIKey[API Key管理]
        Validation[输入验证]
        Sanitization[输出净化]
    end
    
    subgraph "数据流"
        UserInput[用户输入]
        ProcessedData[处理后的数据]
        APIResponse[API响应]
    end
    
    UserInput --> Validation
    Validation --> ProcessedData
    ProcessedData --> APIKey
    APIKey --> Deepseek
    Deepseek --> APIResponse
    APIResponse --> Sanitization
    Sanitization --> UserOutput[用户输出]
```

## 性能优化

1. **代码分割**: 使用React Router的懒加载
2. **状态优化**: 使用useMemo和useCallback
3. **本地缓存**: LocalStorage持久化会话状态
4. **组件复用**: 提取可复用组件
5. **样式优化**: Tailwind CSS按需加载

## 部署架构

```mermaid
graph TB
    subgraph "开发环境"
        ViteDev[Vite开发服务器]
        HMR[热模块替换]
    end
    
    subgraph "生产环境"
        Build[Vite构建]
        StaticFiles[静态文件]
        CDN[CDN分发]
    end
    
    ViteDev --> HMR
    ViteDev --> Build
    Build --> StaticFiles
    StaticFiles --> CDN
```

## 扩展性设计

1. **模块化设计**: 组件和功能模块独立
2. **类型安全**: TypeScript完整类型定义
3. **配置化**: 故事数据可配置
4. **API抽象**: 服务层抽象，易于替换AI服务
5. **状态管理**: Context API可扩展为Redux/Zustand

## 监控与日志

1. **控制台日志**: 关键操作日志记录
2. **错误处理**: try-catch错误捕获
3. **用户反馈**: 错误提示和加载状态
4. **性能监控**: 开发环境性能分析
