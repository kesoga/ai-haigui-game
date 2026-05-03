# AI 海龟汤游戏网站

> 一个基于 AI 主持的文字推理游戏

---

## 项目简介

AI 海龟汤是一款玩家与 AI 主持人互动的问答推理游戏。玩家通过提问引导，猜测故事背后的真相。AI 主持人仅以“是 / 否 / 无关”三值回复问题，考验玩家的逻辑推理和发散思维能力。

---

## 技术栈

- [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- AI 服务（API 通过后端中转，不在前端暴露密钥）

---

## 主要功能

- **游戏大厅**：选择不同的海龟汤故事
- **推理问答**：轮流提问，AI 主持严格三值回答
- **历史记录**：追踪提问与回答全过程
- **结果揭晓**：展示故事全貌，支持再来一轮

---

## 快速开始

1. **克隆项目：**
   ```bash
   git clone https://github.com/kesoga/ai-haigui-game.git
   cd ai-haigui-game
   ```

2. **安装依赖：**
   ```bash
   npm install
   ```
   或
   ```bash
   yarn
   ```

3. **环境配置：**
   - 复制 `.env.example` 为 `.env`（如有）
   - 配置后端 API 地址（例如 `VITE_API_BASE_URL`）
   - AI 服务相关密钥请仅配置在后端或环境变量

4. **启动开发环境：**
   ```bash
   npm run dev
   ```
   或
   ```bash
   yarn dev
   ```

5. **访问应用：**
   打开浏览器，访问 [http://localhost:5173](http://localhost:5173)

---

## 技术规范与风格

- TypeScript 全类型定义，保证类型安全
- 函数组件 + React Hooks (`useState`、`useEffect`、`useContext`)
- Tailwind CSS 全局深色 + 神秘金色强调
- 组件复用、逻辑与 UI 解耦
- 详见 [AGENTS.md](./AGENTS.md)

---

## 参与贡献

欢迎 PR 与意见反馈！

1. Fork 本项目
2. 新建分支开发
3. 提交 PR，描述你的变更

---

## License

[MIT](./LICENSE)

---

## 致谢

灵感来源于经典“海龟汤”推理游戏。感谢所有为本项目贡献想法和代码的人！

