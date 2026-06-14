import { storiesById } from './stories.js';

const VALID_ANSWERS = ['是', '否', '无关'];
const rateLimitBuckets = new Map();

function numberEnv(env, key, fallback) {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify({
    ...body,
    timestamp: body.timestamp || new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function parseAllowedOrigins(env) {
  const configured = env.CORS_ORIGIN || env.FRONTEND_ORIGIN;
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

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = parseAllowedOrigins(env);
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (!origin || allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }

  return headers;
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')
    || 'unknown';
}

function rateLimit(request, env, { windowMs, max, keyPrefix }) {
  const now = Date.now();
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= max) {
    return null;
  }

  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
  return jsonResponse({
    status: 'error',
    message: '请求过于频繁，请稍后重试',
    retryAfterSeconds
  }, {
    status: 429,
    headers: {
      ...corsHeaders(request, env),
      'Retry-After': String(retryAfterSeconds)
    }
  });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 32 * 1024) {
    throw new Error('请求体不能超过 32KB');
  }
  return text ? JSON.parse(text) : {};
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
    return 'story 必须包含非空 id 字段';
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
    .replace(/[，。！？、；：“”‘’'()[\]{}<>《》\s]/g, '')
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
      questionSignals: ['走了', '离开', '出去了', '不在电梯', '不见人'],
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
    return { answer: '否', isFallback: false, retriesCount: 0, providerResponseValid: true };
  }

  if (hasBottomContent) {
    return { answer: '是', isFallback: false, retriesCount: 0, providerResponseValid: true };
  }

  if (!hasBottomContent && longestOverlap < 3) {
    return { answer: '无关', isFallback: false, retriesCount: 0, providerResponseValid: true };
  }

  return null;
}

function buildSystemPrompt(story) {
  return `你是海龟汤游戏裁判。请根据汤面和汤底回答玩家问题。只能返回一个词：是、否、无关。
判定规则：
1. 是：玩家问题包含汤底中的关键信息，逻辑与汤底一致，能够推理出汤底或汤底的一部分。
2. 否：玩家问题和汤底在逻辑上冲突，或提出了与汤底不同/相反的事实。
3. 无关：玩家问题和汤底在内容、因果、逻辑上都没有关系，无法帮助推理汤底。
4. 如果玩家要求直接揭示完整真相，而不是提出猜测，返回“无关”。

汤面：${story.surface}
汤底：${story.bottom}`;
}

async function callDeepSeek({ question, story, env, signal }) {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-chat',
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

async function askProviderWithFallback(question, story, env) {
  if (!env.DEEPSEEK_API_KEY) {
    const localAnswer = answerFromLocalHeuristics(question, story);
    return localAnswer
      ? { ...localAnswer, isFallback: true, providerResponseValid: false }
      : { answer: '无关', isFallback: true, retriesCount: 0, providerResponseValid: false };
  }

  let lastRawAnswer = '';
  let retriesCount = 0;
  const retryMax = numberEnv(env, 'ASK_RETRY_MAX', 2);
  const timeoutMs = numberEnv(env, 'ASK_TIMEOUT_MS', 8000);

  for (let attempt = 0; attempt <= retryMax; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      lastRawAnswer = await callDeepSeek({ question, story, env, signal: controller.signal });
      if (isValidTriAnswer(lastRawAnswer)) {
        return { answer: lastRawAnswer, isFallback: false, retriesCount, providerResponseValid: true };
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
  return localAnswer
    ? { ...localAnswer, isFallback: true, providerResponseValid: false }
    : { answer: '无关', isFallback: true, retriesCount: Math.max(0, retriesCount - 1), providerResponseValid: false };
}

async function handleChat(request, env) {
  const limited = rateLimit(request, env, {
    windowMs: numberEnv(env, 'RATE_LIMIT_WINDOW_MS', 60_000),
    max: numberEnv(env, 'CHAT_RATE_LIMIT_MAX', 30),
    keyPrefix: 'chat'
  });
  if (limited) {
    return limited;
  }

  const body = await readJson(request);
  const validationError = validateChatPayload(body);
  if (validationError) {
    return jsonResponse({ status: 'error', message: validationError }, { status: 400 });
  }

  const resolvedStory = resolveStory(body.story);
  if (!resolvedStory) {
    return jsonResponse({ status: 'error', message: '故事不存在或缺少汤面/汤底数据' }, { status: 404 });
  }

  const result = await askProviderWithFallback(body.question.trim(), resolvedStory, env);
  return jsonResponse({ status: 'success', ...result });
}

function handleBottom(request, env, storyId) {
  const limited = rateLimit(request, env, {
    windowMs: numberEnv(env, 'RATE_LIMIT_WINDOW_MS', 60_000),
    max: numberEnv(env, 'REVEAL_RATE_LIMIT_MAX', 60),
    keyPrefix: 'bottom'
  });
  if (limited) {
    return limited;
  }

  const story = storiesById.get(storyId);
  if (!story) {
    return jsonResponse({ status: 'error', message: '故事不存在' }, { status: 404 });
  }

  return jsonResponse({ status: 'success', storyId: story.id, bottom: story.bottom });
}

async function handleGuess(request, env, storyId) {
  const limited = rateLimit(request, env, {
    windowMs: numberEnv(env, 'RATE_LIMIT_WINDOW_MS', 60_000),
    max: numberEnv(env, 'CHAT_RATE_LIMIT_MAX', 30),
    keyPrefix: 'guess'
  });
  if (limited) {
    return limited;
  }

  const story = storiesById.get(storyId);
  if (!story) {
    return jsonResponse({ status: 'error', message: '故事不存在' }, { status: 404 });
  }

  const { answer } = await readJson(request);
  if (typeof answer !== 'string' || !answer.trim()) {
    return jsonResponse({ status: 'error', message: 'answer 必须是非空字符串' }, { status: 400 });
  }

  const similarity = calculateSimilarity(answer, story.bottom);
  return jsonResponse({ status: 'success', storyId: story.id, isCorrect: similarity >= 0.7, similarity });
}

async function routeRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (request.method === 'GET' && url.pathname === '/') {
    return jsonResponse({
      status: 'success',
      message: 'AI 海龟汤 Worker 后端服务运行中',
      endpoints: { health: '/api/test', chat: '/api/chat' }
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/test') {
    return jsonResponse({ status: 'success', message: 'Worker backend is healthy' });
  }

  if (request.method === 'POST' && url.pathname === '/api/chat') {
    return handleChat(request, env);
  }

  const bottomMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/bottom$/);
  if (request.method === 'GET' && bottomMatch) {
    return handleBottom(request, env, decodeURIComponent(bottomMatch[1]));
  }

  const guessMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/guess$/);
  if (request.method === 'POST' && guessMatch) {
    return handleGuess(request, env, decodeURIComponent(guessMatch[1]));
  }

  return jsonResponse({
    status: 'error',
    message: '接口不存在，请检查请求路径',
    path: url.pathname,
    method: request.method
  }, { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      const response = await routeRequest(request, env);
      return withCors(response, request, env);
    } catch (error) {
      console.error(`${request.method} ${new URL(request.url).pathname}`, error);
      return withCors(jsonResponse({
        status: 'error',
        message: '服务器内部错误，请稍后重试',
        error: env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      }, { status: 500 }), request, env);
    }
  }
};

export {
  calculateSimilarity,
  resolveStory,
  validateChatPayload,
  answerFromLocalHeuristics,
  buildSystemPrompt,
  isValidTriAnswer
};
