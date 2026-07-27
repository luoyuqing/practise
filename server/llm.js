import { buildOpenaiEndpoint, buildAnthropicEndpoint } from './utils.js';

/**
 * Summarize text using the configured LLM (non-streaming).
 * Used for auto-generating session titles.
 */
export async function summarizeText(request) {
  const systemPrompt = '请使用用户输入的消息，总结用户意图，不超过15个字。务必注意，是总结用户意图，而不是回应用户的消息';
  const userPrompt = `通过以下信息，总结意图，不超过15个字：${request.text}`;
  const maxTokens = Math.min(request.maxOutputTokens || 64, 128);

  if (request.modelInterface === 'Anthropic-compatible') {
    return summarizeAnthropic(request, systemPrompt, userPrompt, maxTokens);
  }
  return summarizeOpenai(request, systemPrompt, userPrompt, maxTokens);
}

async function summarizeAnthropic(req, sysPrompt, userPrompt, maxTokens) {
  const endpoint = buildAnthropicEndpoint(req.baseUrl);
  const body = {
    model: req.model,
    messages: [{ role: 'user', content: userPrompt }],
    system: sysPrompt,
    stream: false,
    temperature: req.temperature ?? 0.3,
    max_tokens: maxTokens,
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Anthropic 接口请求失败：${resp.status} ${text}`);
  }

  const json = await resp.json();
  const content = (json.content || [])
    .find((b) => b.type === 'text')
    ?.text?.trim()
    ?.replace(/["'「」『』]/g, '') || '';

  if (!content) throw new Error('生成标题为空');
  return content;
}

async function summarizeOpenai(req, sysPrompt, userPrompt, maxTokens) {
  const endpoint = buildOpenaiEndpoint(req.baseUrl);
  const body = {
    model: req.model,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    temperature: req.temperature ?? 0.3,
    max_tokens: maxTokens,
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenAI 兼容接口请求失败：${resp.status} ${text}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content?.trim()?.replace(/["'「」『』]/g, '') || '';

  if (!content) throw new Error('生成标题为空');
  return content;
}

/**
 * Start a streaming chat completion.
 * Returns an async generator that yields ChatStreamEvent objects.
 *
 * This is a simplified agent loop that handles:
 * - Text streaming (delta events)
 * - Tool calls (start/delta/status events)
 * - Error handling
 *
 * For the web server version, tool execution is limited to:
 * - read: read file contents
 * - write: write file contents
 * - bash: execute shell commands (optional, disabled by default)
 */
export async function* startChatStream(request, options = {}) {
  const runId = options.runId || crypto.randomUUID();
  const { allowedTools = [], workspacePath } = request;

  // Emit start event
  yield { runId, eventType: 'start', delta: null, message: '开始生成回复' };

  try {
    if (request.modelInterface === 'Anthropic-compatible') {
      yield* streamAnthropicRound(runId, request, allowedTools, workspacePath);
    } else {
      yield* streamOpenaiRound(runId, request, allowedTools, workspacePath);
    }
    yield { runId, eventType: 'done', delta: null, message: null };
  } catch (error) {
    yield { runId, eventType: 'error', delta: null, message: error.message };
  }
}

async function* streamOpenaiRound(runId, request, allowedTools, workspacePath) {
  const endpoint = buildOpenaiEndpoint(request.baseUrl);
  const messages = buildOpenaiMessages(request);
  const body = {
    model: request.model,
    messages,
    stream: true,
    temperature: request.temperature ?? 0.7,
  };
  if (request.maxOutputTokens) body.max_tokens = request.maxOutputTokens;
  if (request.frequencyPenalty) body.frequency_penalty = request.frequencyPenalty;
  if (request.presencePenalty) body.presence_penalty = request.presencePenalty;
  if (request.topP) body.top_p = request.topP;

  if (allowedTools && allowedTools.length > 0) {
    body.tools = allowedTools.map((name) => ({
      type: 'function',
      function: {
        name,
        description: getToolDescription(name),
        parameters: getToolSchema(name),
      },
    }));
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenAI 接口请求失败：${resp.status} ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const choice = json.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (delta?.content) {
          fullContent += delta.content;
          yield { runId, eventType: 'delta', delta: delta.content, message: null };
        }
      } catch {
        continue;
      }
    }
  }
}

async function* streamAnthropicRound(runId, request, allowedTools, workspacePath) {
  const endpoint = buildAnthropicEndpoint(request.baseUrl);
  const body = {
    model: request.model,
    messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
    system: request.systemPrompt,
    stream: true,
    max_tokens: request.maxOutputTokens || 4096,
    temperature: request.temperature ?? 0.7,
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Anthropic 接口请求失败：${resp.status} ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      try {
        const json = JSON.parse(data);
        if (json.type === 'content_block_delta' && json.delta?.text) {
          yield { runId, eventType: 'delta', delta: json.delta.text, message: null };
        }
      } catch {
        continue;
      }
    }
  }
}

function buildOpenaiMessages(request) {
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  for (const msg of request.messages) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }
  return messages;
}

function getToolDescription(name) {
  const descs = {
    read: 'Read the contents of a file at the given path.',
    write: 'Write content to a file at the given path.',
    bash: 'Execute a bash command and return its output.',
  };
  return descs[name] || `Tool: ${name}`;
}

function getToolSchema(name) {
  const schemas = {
    read: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
    write: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
    bash: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Bash command to execute' },
      },
      required: ['command'],
    },
  };
  return schemas[name] || { type: 'object', properties: {} };
}

/**
 * Test LLM connection (non-streaming, one simple message).
 */
export async function testConnection(request) {
  if (request.modelInterface === 'Anthropic-compatible') {
    const endpoint = buildAnthropicEndpoint(request.baseUrl);
    const body = {
      model: request.model,
      messages: [{ role: 'user', content: 'Hello, please respond with "OK".' }],
      max_tokens: 10,
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`连接失败：${resp.status} ${text}`);
    }
    return true;
  }

  const endpoint = buildOpenaiEndpoint(request.baseUrl);
  const body = {
    model: request.model,
    messages: [{ role: 'user', content: 'Hello, please respond with "OK".' }],
    max_tokens: 10,
  };
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`连接失败：${resp.status} ${text}`);
  }
  return true;
}