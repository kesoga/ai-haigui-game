const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const port = 3000;

// 配置CORS
app.use(cors({
  origin: '*', // 允许所有来源，生产环境中应该设置具体的前端域名
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 处理JSON请求体
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  const { method, url, headers, body } = req;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);
  console.log('请求头:', headers);
  if (Object.keys(body).length > 0) {
    console.log('请求体:', body);
  }
  
  // 拦截响应结束事件
  const originalSend = res.send;
  res.send = function(body) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const statusCode = res.statusCode;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${responseTime}ms`);
    if (body && typeof body === 'string') {
      try {
        const parsedBody = JSON.parse(body);
        if (parsedBody.status === 'error') {
          console.log('错误响应:', parsedBody);
        }
      } catch (e) {
        // 非JSON响应，忽略
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'Backend server is running!',
    status: 'success',
    endpoints: {
      test: '/api/test',
      chat: '/api/chat'
    },
    timestamp: new Date().toISOString()
  });
});

// 测试接口
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Hello from backend!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// 检查用户输入是否与汤底高度相似
function isSimilarToBottom(input, bottom) {
  // 预处理：去除多余空格和标点符号，转换为小写
  const cleanInput = input.toLowerCase().replace(/\s+/g, ' ').trim();
  const cleanBottom = bottom.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // 如果输入包含汤底的主要部分，返回true
  if (cleanBottom.includes(cleanInput) || cleanInput.includes(cleanBottom)) {
    return true;
  }
  
  // 计算相似度（简单的词匹配）
  const inputWords = cleanInput.split(' ').filter(word => word.length > 1);
  const bottomWords = cleanBottom.split(' ').filter(word => word.length > 1);
  
  if (inputWords.length === 0 || bottomWords.length === 0) {
    return false;
  }
  
  const matchedWords = inputWords.filter(word => bottomWords.includes(word));
  const similarity = matchedWords.length / Math.min(inputWords.length, bottomWords.length);
  
  return similarity > 0.7; // 相似度超过70%就算相似
}

// AI对话接口
app.post('/api/chat', async (req, res) => {
  try {
    const { question, story } = req.body;
    
    console.log('=== 新的AI对话请求 ===');
    console.log('用户问题:', question);
    console.log('故事ID:', story.id);
    console.log('汤面:', story.surface);
    console.log('汤底:', story.bottom);
    
    // 验证参数
    if (!question || !story) {
      console.log('错误: 缺少必要参数');
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数: question 和 story'
      });
    }
    
    if (!story.surface || !story.bottom) {
      console.log('错误: story 对象缺少必要字段');
      return res.status(400).json({
        status: 'error',
        message: 'story 对象缺少必要字段: surface 和 bottom'
      });
    }
    
    // 检查用户输入是否是单个字或词
    const cleanedQuestion = question.trim();
    const words = cleanedQuestion.split(/\s+/).filter(word => word.length > 0);
    if (words.length === 1 && words[0].length <= 2) {
      console.log('用户输入是单个字或词，直接返回"无关"');
      const responseData = {
        status: 'success',
        answer: '无关',
        timestamp: new Date().toISOString()
      };
      console.log('响应:', responseData);
      return res.json(responseData);
    }
    
    // 首先检查用户输入是否与汤底高度相似
    if (isSimilarToBottom(question, story.bottom)) {
      console.log('用户输入与汤底高度相似，直接返回"是"');
      const responseData = {
        status: 'success',
        answer: '是',
        timestamp: new Date().toISOString()
      };
      console.log('响应:', responseData);
      return res.json(responseData);
    }
    
    // 获取API Key
    const API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!API_KEY) {
      console.log('错误: API Key 未配置');
      return res.status(500).json({
        status: 'error',
        message: 'API Key 未配置'
      });
    }
    
    // 构建系统提示
    const systemPrompt = `# 角色定位
你是一个严格、公正的海龟汤游戏裁判，精通游戏规则，能够准确判断玩家问题与汤底的关系。

# 核心任务
你的唯一任务是根据提供的汤面和汤底，用「是」、「否」或「无关」三个词中的一个来回答玩家的问题，不允许使用任何其他词语或符号。

# 汤面和汤底
汤面：${story.surface}
汤底：${story.bottom}

# 严格判断标准
1. **是**：当问题的答案在汤底中明确提到，或者可以从汤底内容中明确推断出来时
2. **否**：当问题的答案与汤底内容直接矛盾，或者在汤底中被明确否定时
3. **无关**：当问题与汤面和汤底的内容完全无关，无法从汤底中找到任何相关信息时

# 详细指令
- 仔细阅读并理解汤底的每一个细节
- 严格按照判断标准进行分析
- 只关注问题与汤底的直接关系，忽略其他因素
- 确保回答简洁明了，只包含「是」、「否」或「无关」中的一个
- 不要添加任何解释、标点符号或其他文字
- 如果对答案有任何疑问，选择「无关」

# 丰富示例
假设汤底是：「一个人在沙漠中发现了一个瓶子，打开后里面飞出一个精灵，精灵说可以实现他的一个愿望，他说想要水，精灵给了他一瓶水，他喝了之后就死了」

示例1：
问题：他是因为缺水而死的吗？
回答：否

示例2：
问题：精灵给了他水吗？
回答：是

示例3：
问题：他是在森林里吗？
回答：无关

示例4：
问题：精灵实现了他的愿望吗？
回答：是

示例5：
问题：他是被毒死的吗？
回答：无关

# 强制约束
- ❌ 禁止添加任何解释或额外信息
- ❌ 禁止使用除「是」、「否」、「无关」之外的任何词语
- ❌ 禁止使用任何标点符号
- ❌ 禁止凭空猜测或假设
- ❌ 禁止忽略汤底内容进行回答
- ✅ 必须严格基于汤底内容
- ✅ 必须使用标准中文回答
- ✅ 必须保持回答简洁明了

# 最终要求
请你以最严格的标准执行任务，只返回「是」、「否」或「无关」中的一个词，不要有任何其他内容。`;
    
    console.log('调用DeepSeek API...');
    
    // 调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      console.log('错误: API请求失败:', response.status);
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const answer = data.choices[0]?.message?.content?.trim() || '';
    
    console.log('DeepSeek API响应:', answer);
    
    // 验证回答是否符合规范
    const validAnswers = ['是', '否', '无关'];
    let validatedAnswer = '无关'; // 默认值
    let isFallback = false;
    
    if (validAnswers.includes(answer)) {
      validatedAnswer = answer;
    } else {
      // 尝试从回答中提取有效答案
      if (answer.includes('是')) {
        validatedAnswer = '是';
      } else if (answer.includes('否') || answer.includes('不是')) {
        validatedAnswer = '否';
      } else {
        // Fallback机制：当AI回答不规范时，使用默认回答
        isFallback = true;
        console.log('AI回答不规范，使用默认回答');
      }
    }
    
    console.log('验证后的回答:', validatedAnswer);
    
    const responseData = {
      status: 'success',
      answer: validatedAnswer,
      isFallback: isFallback,
      timestamp: new Date().toISOString()
    };
    
    console.log('响应:', responseData);
    console.log('=== 对话结束 ===\n');
    
    res.json(responseData);
    
  } catch (error) {
    console.error('AI对话错误:', error);
    res.status(500).json({
      status: 'error',
      message: 'AI回答获取失败，请重试',
      error: error.message
    });
  }
});

// 404 错误处理
app.use((req, res, next) => {
  const error = new Error('接口不存在');
  error.status = 404;
  next(error);
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  const errorMessage = error.message || '服务器内部错误';
  
  console.error(`[${new Date().toISOString()}] 错误:`, error);
  
  // 根据错误类型返回不同的错误信息
  let responseMessage = errorMessage;
  if (statusCode === 404) {
    responseMessage = '接口不存在，请检查请求路径';
  } else if (statusCode === 400) {
    responseMessage = errorMessage;
  } else if (statusCode === 500) {
    responseMessage = '服务器内部错误，请稍后重试';
  }
  
  res.status(statusCode).json({
    status: 'error',
    message: responseMessage,
    error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API 接口:`);
  console.log(`  GET  /           -> 服务信息`);
  console.log(`  GET  /api/test   -> 测试接口`);
  console.log(`  POST /api/chat   -> AI 对话接口`);
});
