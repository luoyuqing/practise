import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import {
  resolveMuseAiDir,
  resolveSessionsDir,
  sanitizeSessionId,
  nowMillis,
  sanitizeSettingsState,
} from './utils.js';
import { loadAppState, saveAppState, getRawSettingsState } from './state.js';
import {
  listSessions,
  loadSession,
  saveSession,
  deleteSession,
  updateSessionTitle,
} from './sessions.js';
import { summarizeText, startChatStream, testConnection } from './llm.js';
import { streamManager, StreamManager } from './streamManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Auth ---
const ACCESS_TOKEN = process.env.MUSEAI_TOKEN || crypto.randomUUID();

function authMiddleware(req, res, next) {
  // Public paths don't require auth
  const isPublic = req.path === '/' || req.path === '/api/mobile/status' || req.path.startsWith('/assets/');
  if (isPublic) return next();

  // Check X-Mobile-Token header
  const headerToken = req.headers['x-mobile-token'];
  if (headerToken === ACCESS_TOKEN) return next();

  // Check query param
  if (req.query.token === ACCESS_TOKEN) return next();

  // Check cookie
  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.split(';').find(kv => kv.trim().startsWith('mobile_token='));
  if (cookieMatch) {
    const token = cookieMatch.split('=')[1]?.trim();
    if (token === ACCESS_TOKEN) return next();
  }

  // For web deployment, also check Basic Auth header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (process.env.MUSEAI_BASIC_AUTH_USER && process.env.MUSEAI_BASIC_AUTH_PASS) {
      if (username === process.env.MUSEAI_BASIC_AUTH_USER && password === process.env.MUSEAI_BASIC_AUTH_PASS) {
        return next();
      }
    }
  }

  // If no Basic Auth configured, allow requests without token (open mode for dev)
  if (!process.env.MUSEAI_BASIC_AUTH_USER) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(authMiddleware);

// --- Static file serving ---
// Serve the built frontend (dist/) if available
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

function serveIndex(req, res) {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      status: 'running',
      message: 'MuseAI Server is running. Frontend not built yet.',
      token: ACCESS_TOKEN,
    });
  }
}

// --- Routes ---

// GET / - serve frontend or status
app.get('/', serveIndex);

// GET /api/mobile/status - server status
app.get('/api/mobile/status', (req, res) => {
  res.json({
    isRunning: true,
    url: `http://localhost:${PORT}`,
    token: ACCESS_TOKEN,
    error: null,
  });
});

// GET/POST /api/mobile/state/:name - app state CRUD
app.get('/api/mobile/state/:name', async (req, res) => {
  try {
    const content = await loadAppState(req.params.name);
    if (req.params.name === 'settings-store') {
      try {
        const parsed = JSON.parse(content);
        const sanitized = JSON.stringify(sanitizeSettingsState(parsed));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        return res.send(sanitized);
      } catch {
        // fall through to raw
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.send(content);
  } catch (err) {
    if (err.message.includes('未授权')) return res.status(403).json({ error: err.message });
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/mobile/state/:name', async (req, res) => {
  try {
    // Express body is already parsed as object or raw string
    let content;
    if (typeof req.body === 'string') {
      content = req.body;
    } else {
      content = JSON.stringify(req.body);
    }
    await saveAppState(req.params.name, content);
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.message.includes('未授权')) return res.status(403).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/mobile/sessions - list and save sessions
app.get('/api/mobile/sessions', async (req, res) => {
  try {
    const prefix = req.query.prefix;
    if (prefix !== 'partner-session-' && prefix !== 'story-session-') {
      return res.status(400).json({ error: '缺少或非法的会话前缀' });
    }
    let sessionKind = null;
    if (prefix === 'story-session-') {
      const requested = req.query.sessionKind || 'story';
      if (requested !== 'story') {
        return res.status(400).json({ error: '不合法的会话类型' });
      }
      sessionKind = 'story';
    }
    const summaries = await listSessions(prefix, sessionKind);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mobile/sessions', async (req, res) => {
  try {
    const record = req.body;
    if (!record.id || (!record.id.startsWith('partner-session-') && !record.id.startsWith('story-session-'))) {
      return res.status(403).json({ error: '禁止保存非伴侣或故事会话' });
    }
    if (record.id.startsWith('story-session-')) {
      if (!record.sessionKind) {
        record.sessionKind = 'story';
      } else if (record.sessionKind !== 'story') {
        return res.status(403).json({ error: '禁止保存穿书会话' });
      }
    } else if (record.sessionKind) {
      return res.status(400).json({ error: '聊天会话不应包含会话类型' });
    }

    const summary = await saveSession(record);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET/DELETE /api/mobile/sessions/:id
app.get('/api/mobile/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.startsWith('partner-session-') && !id.startsWith('story-session-')) {
      return res.status(403).json({ error: '禁止访问非伴侣或故事会话' });
    }
    const record = await loadSession(id);
    if (id.startsWith('story-session-') && record.sessionKind && record.sessionKind !== 'story') {
      return res.status(403).json({ error: '禁止访问穿书会话' });
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json(record);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/mobile/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.startsWith('partner-session-') && !id.startsWith('story-session-')) {
      return res.status(403).json({ error: '禁止删除非伴侣或故事会话' });
    }
    await deleteSession(id);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mobile/sessions/:id/title
app.put('/api/mobile/sessions/:id/title', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.startsWith('partner-session-') && !id.startsWith('story-session-')) {
      return res.status(403).json({ error: '禁止更新非伴侣或故事会话' });
    }
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: '缺少标题' });
    const summary = await updateSessionTitle(id, title);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobile/summarize - auto-generate title
app.post('/api/mobile/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '缺少文本' });

    const settings = await getRawSettingsState();
    if (!settings) return res.status(500).json({ error: '大模型配置缺失，请先设置' });

    const title = await summarizeText({
      modelInterface: settings.modelInterface || 'OpenAI',
      baseUrl: settings.llmBaseUrl || '',
      apiKey: settings.llmApiKey || '',
      model: settings.llmModel || '',
      temperature: 0.3,
      maxOutputTokens: 64,
      text,
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared handler for chat/start and story/start
async function handleStartStream(req, res) {
  try {
    const request = req.body;
    if (!request.apiKey?.trim()) return res.status(400).json({ error: 'API Key 不能为空' });
    if (!request.model?.trim()) return res.status(400).json({ error: '模型名称不能为空' });
    if (!request.baseUrl?.trim()) return res.status(400).json({ error: '接口地址不能为空' });
    if (!request.messages?.length) return res.status(400).json({ error: '消息不能为空' });

    const runId = StreamManager.newRunId();
    const controller = new AbortController();
    const generator = startChatStream(request, { runId });

    const eventQueue = [];
    let done = false;
    let waiters = [];

    streamManager.register(runId, { eventQueue, done: false, controller, waiters }, controller);

    (async () => {
      try {
        for await (const event of generator) {
          eventQueue.push(event);
          waiters.forEach(w => w());
          waiters = [];
        }
      } catch (err) {
        eventQueue.push({ runId, eventType: 'error', message: err.message });
        waiters.forEach(w => w());
        waiters = [];
      } finally {
        done = true;
        const entry = streamManager.get(runId);
        if (entry) entry.done = true;
        waiters.forEach(w => w());
        waiters = [];
        setTimeout(() => streamManager.cleanup(runId), 5000);
      }
    })();

    res.json({ runId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/mobile/chat/start - start chat stream
app.post('/api/mobile/chat/start', handleStartStream);

// POST /api/mobile/story/start - start story stream (same handler)
app.post('/api/mobile/story/start', handleStartStream);

// POST /api/mobile/chat/stop - stop a stream
app.post('/api/mobile/chat/stop', (req, res) => {
  const runId = req.body?.runId || req.body?.run_id;
  if (runId && streamManager.stop(runId)) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

// GET /api/mobile/stream - SSE endpoint for stream events
app.get('/api/mobile/stream', async (req, res) => {
  const runId = req.query.runId;
  if (!runId) return res.status(400).json({ error: '缺少 runId 参数' });

  const entry = streamManager.get(runId);
  if (!entry) return res.status(404).json({ error: 'Stream not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Flush any queued events
  let lastIndex = 0;
  const flushEvents = () => {
    while (lastIndex < entry.eventQueue.length) {
      const event = entry.eventQueue[lastIndex];
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      lastIndex++;
    }
    if (entry.done && lastIndex >= entry.eventQueue.length) {
      res.end();
    }
  };

  flushEvents();

  if (!entry.done) {
    // Poll for new events
    const pollInterval = setInterval(() => {
      flushEvents();
      if (entry.done && lastIndex >= entry.eventQueue.length) {
        clearInterval(pollInterval);
        res.end();
      }
    }, 50);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
    });
  }
});

// POST /api/mobile/sessions/:id/analyze-memory - placeholder
app.post('/api/mobile/sessions/:id/analyze-memory', async (req, res) => {
  // Memory analysis requires full LLM integration; return placeholder for now
  res.json({ analysis: 'Memory analysis is not yet supported on the web server.' });
});

// POST /api/mobile/sessions/:id/archive - placeholder
app.post('/api/mobile/sessions/:id/archive', async (req, res) => {
  res.json({ ok: true, message: 'Archiving is not yet supported on the web server.' });
});

// POST /api/mobile/character-cards/convert-silly-tavern - placeholder
app.post('/api/mobile/character-cards/convert-silly-tavern', async (req, res) => {
  res.status(501).json({ error: 'Character card conversion is not yet supported on the web server.' });
});

// POST /api/mobile/test-connection - test LLM connection
app.post('/api/mobile/test-connection', async (req, res) => {
  try {
    await testConnection(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA routes
app.get('*', serveIndex);

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`MuseAI Server running on http://localhost:${PORT}`);
  console.log(`Access token: ${ACCESS_TOKEN}`);
  if (process.env.MUSEAI_BASIC_AUTH_USER) {
    console.log(`Basic Auth enabled: user=${process.env.MUSEAI_BASIC_AUTH_USER}`);
  } else {
    console.log('Warning: No Basic Auth configured. Server is open (dev mode).');
  }
});