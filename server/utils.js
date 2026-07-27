import path from 'path';
import os from 'os';

/**
 * Resolve the document directory for MuseAI data.
 * On Linux server, defaults to ~/Documents (same as Rust fallback).
 */
export function resolveDocumentDir() {
  const home = os.homedir();
  return path.join(home, 'Documents');
}

/**
 * Resolve the MuseAI data directory.
 */
export function resolveMuseAiDir() {
  return path.join(resolveDocumentDir(), 'MuseAI');
}

/**
 * Resolve the config directory for app state JSON files.
 */
export function resolveConfigDir() {
  return path.join(resolveMuseAiDir(), 'config');
}

/**
 * Resolve the agent sessions directory.
 */
export function resolveSessionsDir() {
  return path.join(resolveMuseAiDir(), 'agent-sessions');
}

/**
 * Get current timestamp in milliseconds (matching Rust's now_millis).
 */
export function nowMillis() {
  return Date.now();
}

/**
 * Sanitize session ID to prevent path traversal.
 * Only allows alphanumeric, hyphen, and underscore.
 */
export function sanitizeSessionId(id) {
  const trimmed = (id || '').trim();
  if (!trimmed) throw new Error('session id 不能为空');
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    throw new Error('session id 包含非法字符');
  }
  return trimmed;
}

/**
 * Build the OpenAI chat completions endpoint URL.
 */
export function buildOpenaiEndpoint(baseUrl) {
  return buildEndpoint(baseUrl, 'v1/chat/completions', 'chat/completions');
}

/**
 * Build the Anthropic messages endpoint URL.
 */
export function buildAnthropicEndpoint(baseUrl) {
  return buildEndpoint(baseUrl, 'v1/messages', 'messages');
}

function buildEndpoint(baseUrl, fullSuffix, shortSuffix) {
  let base = baseUrl.trim().replace(/\/+$/, '');
  if (base.endsWith(`/${fullSuffix}`)) return base;
  if (base.endsWith(`/${shortSuffix}`)) return `${base}`;
  // Check if base already includes v1
  if (base.endsWith('/v1')) return `${base}/${shortSuffix}`;
  return `${base}/${fullSuffix}`;
}

/**
 * Check if a file path has a supported content extension.
 */
export function isSupportedContentFile(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return ['md', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
}

/**
 * Approximate token count (same heuristic as Rust: chars/4).
 */
export function approximateTokenCount(text) {
  return Math.ceil((text || '').length / 4);
}

/**
 * Settings state sanitizer: clear API keys when returning settings to client.
 */
export function sanitizeSettingsState(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = { ...val };
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'llmApiKey' || k === 'apiKey') {
        obj[k] = '';
      } else {
        obj[k] = sanitizeSettingsState(v);
      }
    }
    return obj;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeSettingsState);
  }
  return val;
}

/**
 * Merge settings preserving existing API keys when incoming is empty.
 */
export function mergeSettingsPreservingKeys(existing, incoming) {
  if (existing === null || existing === undefined) return incoming;
  if (incoming === null || incoming === undefined) return existing;

  if (typeof existing === 'object' && typeof incoming === 'object' && !Array.isArray(existing) && !Array.isArray(incoming)) {
    const result = { ...existing };
    for (const [k, incVal] of Object.entries(incoming)) {
      if (k === 'llmApiKey' || k === 'apiKey') {
        if (typeof incVal === 'string' && incVal === '') continue;
      }
      if (k in result) {
        result[k] = mergeSettingsPreservingKeys(result[k], incVal);
      } else {
        result[k] = incVal;
      }
    }
    return result;
  }

  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const result = [];
    for (let i = 0; i < incoming.length; i++) {
      if (i < existing.length) {
        result.push(mergeSettingsPreservingKeys(existing[i], incoming[i]));
      } else {
        result.push(incoming[i]);
      }
    }
    return result;
  }

  return incoming;
}