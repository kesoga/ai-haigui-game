const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidTriAnswer,
  validateChatPayload,
  resolveStory,
  calculateSimilarity,
  answerFromLocalHeuristics,
  buildSystemPrompt,
  rateLimit,
  askProviderWithFallback
} = require('./index');

test('validates strict tri-answer values only', () => {
  assert.equal(isValidTriAnswer('是'), true);
  assert.equal(isValidTriAnswer('否'), true);
  assert.equal(isValidTriAnswer('无关'), true);
  assert.equal(isValidTriAnswer('不是'), false);
  assert.equal(isValidTriAnswer('是。'), false);
  assert.equal(isValidTriAnswer('答案是'), false);
});

test('validates chat payload shape', () => {
  const validPayload = {
    question: '他还活着吗？',
    story: {
      id: 's-001',
      surface: '汤面',
      bottom: '汤底'
    }
  };

  assert.equal(validateChatPayload(validPayload), null);
  assert.match(validateChatPayload({ ...validPayload, question: '' }), /question/);
  assert.match(validateChatPayload({ ...validPayload, story: null }), /story/);
});

test('resolves known story bottom on the server', () => {
  const story = resolveStory({ id: 's-001', surface: '客户端汤面' });

  assert.equal(story.id, 's-001');
  assert.equal(typeof story.bottom, 'string');
  assert.equal(story.bottom.length > 0, true);
});

test('scores final guesses without exposing bottoms to the frontend bundle', () => {
  const similarity = calculateSimilarity(
    '湿伞是他留下给救援人员的标记',
    '湿伞是他故意留下的标记，提醒救援人员这里曾有人被困。'
  );

  assert.equal(similarity >= 0.7, true);
});

test('answers yes when the question contains key soup-bottom information', () => {
  const result = answerFromLocalHeuristics(
    '电梯里的人是从顶盖爬出去求救，湿伞是留下的标记吗？',
    {
      surface: '大厅停电前，一个人独自进了电梯；来电后，电梯里只剩下一把湿伞。',
      bottom: '电梯里的人并没有消失，而是电梯困住后从顶盖爬出求救。湿伞是他故意留下的标记，提醒救援人员这里曾有人被困。'
    }
  );

  assert.equal(result.answer, '是');
});

test('answers no when the question conflicts with the soup-bottom logic', () => {
  const result = answerFromLocalHeuristics(
    '电梯里的人已经死了吗？',
    {
      surface: '大厅停电前，一个人独自进了电梯；来电后，电梯里只剩下一把湿伞。',
      bottom: '电梯里的人并没有消失，而是电梯困住后从顶盖爬出求救。湿伞是他故意留下的标记，提醒救援人员这里曾有人被困。'
    }
  );

  assert.equal(result.answer, '否');
});

test('handles short implied questions about the soup-bottom', () => {
  const story = {
    surface: '大厅停电前，一个人独自进了电梯；来电后，电梯里只剩下一把湿伞。',
    bottom: '电梯里的人并没有消失，而是电梯困住后从顶盖爬出求救。湿伞是他故意留下的标记，提醒救援人员这里曾有人被困。'
  };

  assert.equal(answerFromLocalHeuristics('人走了吗？', story).answer, '是');
  assert.equal(answerFromLocalHeuristics('人被困了吗？', story).answer, '是');
  assert.equal(answerFromLocalHeuristics('人被别人救了吗？', story).answer, '否');
});

test('answers unrelated only when content and logic do not connect to the bottom', () => {
  const result = answerFromLocalHeuristics(
    '这件事和一只红色杯子有关吗？',
    {
      surface: '大厅停电前，一个人独自进了电梯；来电后，电梯里只剩下一把湿伞。',
      bottom: '电梯里的人并没有消失，而是电梯困住后从顶盖爬出求救。湿伞是他故意留下的标记，提醒救援人员这里曾有人被困。'
    }
  );

  assert.equal(result.answer, '无关');
});

test('system prompt documents the intended yes/no/unrelated boundaries', () => {
  const prompt = buildSystemPrompt({ surface: '汤面', bottom: '汤底' });

  assert.match(prompt, /是：玩家问题包含汤底中的关键信息/);
  assert.match(prompt, /否：玩家问题和汤底在逻辑上冲突/);
  assert.match(prompt, /无关：玩家问题和汤底在内容、因果、逻辑上都没有关系/);
});

test('falls back without provider key so local prototype remains playable', async () => {
  const previousKey = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;

  const result = await askProviderWithFallback('他还活着吗？', {
    surface: '汤面',
    bottom: '汤底'
  });

  if (previousKey === undefined) {
    delete process.env.DEEPSEEK_API_KEY;
  } else {
    process.env.DEEPSEEK_API_KEY = previousKey;
  }

  assert.deepEqual(result, {
    answer: '无关',
    isFallback: true,
    retriesCount: 0,
    providerResponseValid: false
  });
});

test('rate limiter blocks requests after the configured maximum', async () => {
  const middleware = rateLimit({
    windowMs: 1000,
    max: 1,
    keyPrefix: `test-${Date.now()}`
  });
  const calls = [];

  function createReq() {
    return {
      ip: '127.0.0.1',
      socket: {}
    };
  }

  function createRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      set(name, value) {
        this.headers[name] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };
  }

  const firstRes = createRes();
  middleware(createReq(), firstRes, () => calls.push('next'));

  const secondRes = createRes();
  middleware(createReq(), secondRes, () => calls.push('next'));

  assert.deepEqual(calls, ['next']);
  assert.equal(secondRes.statusCode, 429);
  assert.equal(secondRes.body.status, 'error');
});
