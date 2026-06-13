const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { storiesById } = require('./stories');

dotenv.config({ quiet: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const AUTH_COOKIE_NAME = 'haigui_auth';
const AUTH_TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);
const VALID_ANSWERS = ['是', '否', '无关'];
const DEFAULT_TIMEOUT_MS = Number(process.env.ASK_TIMEOUT_MS || 8000);
const DEFAULT_RETRY_MAX = Number(process.env.ASK_RETRY_MAX || 2);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const CHAT_RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX || 30);
const REVEAL_RATE_LIMIT_MAX = Number(process.env.REVEAL_RATE_LIMIT_MAX || 60);
const rateLimitBuckets = new Map();
const authTokens = new Map();

function parseAllowedOrigins() {
  const configured = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN;
  if (configured) {
    return configured.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173'
  ];
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || parseAllowedOrigins().includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin is not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '32kb' }));

function parseCookies(cookieHeader) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }
      const name = decodeURIComponent(part.slice(0, separatorIndex));
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      cookies[name] = value;
      return cookies;
    }, {});
}

function createAuthToken() {
  const token = crypto.randomUUID();
  authTokens.set(token, Date.now() + AUTH_TOKEN_TTL_MS);
  return token;
}

function isAuthTokenValid(token) {
  const expiresAt = authTokens.get(token);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    authTokens.delete(token);
    return false;
  }
  return true;
}

function setAuthCookie(res, token) {
  const maxAgeSeconds = Math.floor(AUTH_TOKEN_TTL_MS / 1000);
  res.set('Set-Cookie', `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`);
}

function requireAppAuth(req, res, next) {
  if (!APP_PASSWORD) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (isAuthTokenValid(cookies[AUTH_COOKIE_NAME])) {
    next();
    return;
  }

  res.status(401).json({
    status: 'error',
    message: '需要访问密码',
    timestamp: new Date().toISOString()
  });
}

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startTime}ms`);
  });
  next();
});

function rateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${clientIp}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        status: 'error',
        message: '请求过于频繁，请稍后再试',
        retryAfterSeconds,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

function isValidTriAnswer(answer) {
  return VALID_ANSWERS.includes(String(answer || '').trim());
}

function validateChatPayload(body) {
  const { question, story } = body || {};

  if (typeof question !== 'string' || question.trim().length === 0) {
    return 'question 必须是非空字符串';
  }
  if (question.length > 300) {
    return 'question 不能超过 300 个字符';
  }
  if (!story || typeof story !== 'object') {
    return 'story 必须是对象';
  }
  if (typeof story.id !== 'string' || !story.id.trim()) {
    return 'story 必须包含非空 id 字符串字段';
  }
  if (story.surface !== undefined && typeof story.surface !== 'string') {
    return 'story.surface 必须是字符串';
  }

  return null;
}

function resolveStory(requestStory) {
  const catalogStory = storiesById.get(requestStory.id);
  const resolvedStory = {
    id: requestStory.id,
    surface: catalogStory?.surface || requestStory.surface,
    bottom: catalogStory?.bottom || requestStory.bottom
  };

  if (!resolvedStory.surface || !resolvedStory.bottom) {
    return null;
  }

  return resolvedStory;
}

function normalizeForComparison(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[，。！？、；：“”‘’"'()[\]{}<>《》\s]/g, '')
    .trim();
}

function calculateSimilarity(text1, text2) {
  const cleanText1 = normalizeForComparison(text1);
  const cleanText2 = normalizeForComparison(text2);

  if (!cleanText1 || !cleanText2) {
    return 0;
  }

  if (cleanText1.includes(cleanText2) || cleanText2.includes(cleanText1)) {
    return Math.min(cleanText1.length, cleanText2.length) / Math.max(cleanText1.length, cleanText2.length);
  }

  const chars1 = Array.from(new Set(cleanText1));
  const chars2 = Array.from(new Set(cleanText2));
  const matchedChars = chars1.filter((char) => chars2.includes(char));

  return matchedChars.length / Math.min(chars1.length, chars2.length);
}

function longestCommonSubstringLength(text1, text2) {
  const cleanText1 = normalizeForComparison(text1);
  const cleanText2 = normalizeForComparison(text2);
  let bestLength = 0;

  for (let start = 0; start < cleanText1.length; start += 1) {
    for (let end = start + 2; end <= cleanText1.length; end += 1) {
      const fragment = cleanText1.slice(start, end);
      if (cleanText2.includes(fragment) && fragment.length > bestLength) {
        bestLength = fragment.length;
      }
    }
  }

  return bestLength;
}

function hasNegation(text) {
  return ['不是', '没有', '没', '并非', '不会', '不在', '无人', '无'].some((word) => text.includes(word));
}

function hasConflictSignal(question, bottom) {
  const cleanQuestion = normalizeForComparison(question);
  const cleanBottom = normalizeForComparison(bottom);
  if (['死', '死亡', '去世'].some((word) => cleanQuestion.includes(word))
    && ['求救', '被困', '没有消失', '活着', '安好'].some((word) => cleanBottom.includes(word))) {
    return true;
  }
  if (['被别人救', '被人救', '别人救', '获救'].some((word) => cleanQuestion.includes(word))
    && ['爬出求救', '留下的标记', '提醒救援'].some((word) => cleanBottom.includes(word))) {
    return true;
  }

  const conflictPairs = [
    ['死', '活'],
    ['死亡', '活着'],
    ['消失', '没有消失'],
    ['故意', '无意'],
    ['人为', '自动'],
    ['召唤', '驱散'],
    ['正放', '倒放'],
    ['陌生人', '朋友'],
    ['外人', '亲人'],
    ['丢弃', '留下']
  ];

  return conflictPairs.some(([left, right]) => (
    cleanQuestion.includes(left) && cleanBottom.includes(right)
  ) || (
    cleanQuestion.includes(right) && cleanBottom.includes(left)
  ));
}

function hasImpliedBottomSignal(question, bottom) {
  const cleanQuestion = normalizeForComparison(question);
  const cleanBottom = normalizeForComparison(bottom);

  const implicationRules = [
    {
      questionSignals: ['走了', '离开', '出去了', '不在电梯', '不见了'],
      bottomSignals: ['爬出求救', '没有消失', '顶盖爬出']
    },
    {
      questionSignals: ['被困', '困住', '困在电梯', '卡住'],
      bottomSignals: ['电梯困住', '被困']
    },
    {
      questionSignals: ['顶盖', '爬出', '爬出去', '求救'],
      bottomSignals: ['顶盖爬出求救', '爬出求救']
    },
    {
      questionSignals: ['湿伞', '标记', '留下'],
      bottomSignals: ['湿伞', '留下的标记']
    }
  ];

  return implicationRules.some((rule) => (
    rule.questionSignals.some((signal) => cleanQuestion.includes(signal))
    && rule.bottomSignals.some((signal) => cleanBottom.includes(signal))
  ));
}

function answerFromLocalHeuristics(question, story) {
  const cleanQuestion = normalizeForComparison(question);
  const cleanBottom = normalizeForComparison(story.bottom);
  const similarity = calculateSimilarity(cleanQuestion, cleanBottom);
  const longestOverlap = longestCommonSubstringLength(cleanQuestion, cleanBottom);
  const hasBottomContent = similarity >= 0.34 || longestOverlap >= 4 || hasImpliedBottomSignal(cleanQuestion, cleanBottom);

  if (hasBottomContent && hasConflictSignal(cleanQuestion, cleanBottom)) {
    return {
      answer: '否',
      isFallback: false,
      retriesCount: 0,
      providerResponseValid: true
    };
  }

  if (hasBottomContent) {
    return {
      answer: '是',
      isFallback: false,
      retriesCount: 0,
      providerResponseValid: true
    };
  }

  if (!hasBottomContent && longestOverlap < 3) {
    return {
      answer: '无关',
      isFallback: false,
      retriesCount: 0,
      providerResponseValid: true
    };
  }

  return null;
}

function buildSystemPrompt(story) {
  return `你是海龟汤游戏裁判。请根据汤面和汤底回答玩家问题。
只能返回一个词：是、否、无关。

判定规则：
1. 是：玩家问题包含汤底中的关键信息，逻辑与汤底一致，能够推出汤底或汤底的一部分。
2. 否：玩家问题和汤底在逻辑上冲突，或提出了与汤底不同/相反的事实。
3. 无关：玩家问题和汤底在内容、因果、逻辑上都没有关系，无法帮助推理汤底。
4. 如果玩家要求直接揭示完整真相，而不是提出猜测，返回“无关”。

注意：
- 不要机械匹配字面词，要理解同义表达和短问法。
- “人走了吗”可以理解为“人是否离开了原位置/不在现场了”，如果汤底支持，应回答“是”。
- “人被困了吗”如果对应汤底里的被困事实，应回答“是”。
- “被别人救了吗”如果汤底是自己逃出、自己求救或只是留下标记，应回答“否”。
- 问题中出现“无法、不是为了、没有办法”等词时，不要因为有否定字就直接判“否”；必须看整句话是否和汤底逻辑冲突。

示例：
汤底：人被电梯困住后从顶盖爬出求救，湿伞是留下的标记。
问：人被困了吗？答：是
问：人走了吗？答：是
问：湿伞是标记吗？答：是
问：人被别人救了吗？答：否
问：这件事和红色杯子有关吗？答：无关

汤面：${story.surface}
汤底：${story.bottom}`;
}

async function callDeepSeek({ question, story, signal }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(story) },
        { role: 'user', content: question }
      ],
      temperature: 0,
      max_tokens: 8
    })
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function askProviderWithFallback(question, story) {
  if (!process.env.DEEPSEEK_API_KEY) {
    const localAnswer = answerFromLocalHeuristics(question, story);
    if (localAnswer) {
      return {
        ...localAnswer,
        isFallback: true,
        providerResponseValid: false
      };
    }

    return {
      answer: '无关',
      isFallback: true,
      retriesCount: 0,
      providerResponseValid: false
    };
  }

  let lastRawAnswer = '';
  let retriesCount = 0;

  for (let attempt = 0; attempt <= DEFAULT_RETRY_MAX; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      lastRawAnswer = await callDeepSeek({ question, story, signal: controller.signal });

      if (isValidTriAnswer(lastRawAnswer)) {
        return {
          answer: lastRawAnswer,
          isFallback: false,
          retriesCount,
          providerResponseValid: true
        };
      }
    } catch (error) {
      lastRawAnswer = error instanceof Error ? error.message : 'unknown provider error';
    } finally {
      clearTimeout(timeout);
    }

    retriesCount += 1;
  }

  console.warn('Provider response fell back to 无关:', lastRawAnswer);

  const localAnswer = answerFromLocalHeuristics(question, story);
  if (localAnswer) {
    return {
      ...localAnswer,
      isFallback: true,
      providerResponseValid: false
    };
  }

  return {
    answer: '无关',
    isFallback: true,
    retriesCount: Math.max(0, retriesCount - 1),
    providerResponseValid: false
  };
}

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'AI 海龟汤后端服务运行中',
    endpoints: {
      health: '/api/test',
      chat: '/api/chat'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend server is healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/status', (req, res) => {
  if (!APP_PASSWORD) {
    res.json({
      status: 'success',
      authRequired: false,
      authenticated: true,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  res.json({
    status: 'success',
    authRequired: true,
    authenticated: isAuthTokenValid(cookies[AUTH_COOKIE_NAME]),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 10,
  keyPrefix: 'auth'
}), (req, res) => {
  if (!APP_PASSWORD) {
    res.json({
      status: 'success',
      authRequired: false,
      authenticated: true,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== APP_PASSWORD) {
    res.status(401).json({
      status: 'error',
      message: '访问密码错误',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const token = createAuthToken();
  setAuthCookie(res, token);
  res.json({
    status: 'success',
    authRequired: true,
    authenticated: true,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: CHAT_RATE_LIMIT_MAX,
  keyPrefix: 'chat'
}), requireAppAuth, async (req, res, next) => {
  try {
    const validationError = validateChatPayload(req.body);
    if (validationError) {
      res.status(400).json({ status: 'error', message: validationError, timestamp: new Date().toISOString() });
      return;
    }

    const { question, story } = req.body;
    const resolvedStory = resolveStory(story);
    if (!resolvedStory) {
      res.status(404).json({
        status: 'error',
        message: '故事不存在或缺少汤面/汤底数据',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await askProviderWithFallback(question.trim(), resolvedStory);

    res.json({
      status: 'success',
      answer: result.answer,
      isFallback: result.isFallback,
      retriesCount: result.retriesCount,
      providerResponseValid: result.providerResponseValid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/stories/:storyId/bottom', rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: REVEAL_RATE_LIMIT_MAX,
  keyPrefix: 'bottom'
}), requireAppAuth, (req, res) => {
  const story = storiesById.get(req.params.storyId);
  if (!story) {
    res.status(404).json({ status: 'error', message: '故事不存在', timestamp: new Date().toISOString() });
    return;
  }

  res.json({
    status: 'success',
    storyId: story.id,
    bottom: story.bottom,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/stories/:storyId/guess', rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: CHAT_RATE_LIMIT_MAX,
  keyPrefix: 'guess'
}), requireAppAuth, (req, res) => {
  const story = storiesById.get(req.params.storyId);
  const { answer } = req.body || {};

  if (!story) {
    res.status(404).json({ status: 'error', message: '故事不存在', timestamp: new Date().toISOString() });
    return;
  }

  if (typeof answer !== 'string' || !answer.trim()) {
    res.status(400).json({
      status: 'error',
      message: 'answer 必须是非空字符串',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const similarity = calculateSimilarity(answer, story.bottom);

  res.json({
    status: 'success',
    storyId: story.id,
    isCorrect: similarity >= 0.7,
    similarity,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: '接口不存在，请检查请求路径',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(`${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    status: 'error',
    message: '服务器内部错误，请稍后重试',
    error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}

module.exports = {
  app,
  isValidTriAnswer,
  validateChatPayload,
  resolveStory,
  calculateSimilarity,
  answerFromLocalHeuristics,
  buildSystemPrompt,
  rateLimit,
  askProviderWithFallback
};
