import fs from 'fs';
import path from 'path';
import { resolveConfigDir, sanitizeSettingsState, mergeSettingsPreservingKeys } from './utils.js';

/**
 * Allowed app state names.
 */
const ALLOWED_STATE_NAMES = ['settings-store', 'partner-store', 'partner-chat-store', 'story-store'];

/**
 * Load app state from disk.
 * @param {string} name - State store name
 * @returns {Promise<string>} Raw JSON string content
 */
export async function loadAppState(name) {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('非法的状态名称');
  }
  if (!ALLOWED_STATE_NAMES.includes(name)) {
    throw new Error('未授权访问该配置');
  }
  const filePath = path.join(resolveConfigDir(), `${name}.json`);
  return fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Save app state to disk.
 * @param {string} name - State store name
 * @param {string} content - Raw JSON string content
 */
export async function saveAppState(name, content) {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('非法的状态名称');
  }
  if (!ALLOWED_STATE_NAMES.includes(name)) {
    throw new Error('未授权保存该配置');
  }
  const configDir = resolveConfigDir();
  await fs.promises.mkdir(configDir, { recursive: true });
  const filePath = path.join(configDir, `${name}.json`);

  let finalContent = content;
  if (name === 'settings-store') {
    try {
      const incoming = JSON.parse(content);
      const existingRaw = await fs.promises.readFile(filePath, 'utf-8').catch(() => null);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        const merged = mergeSettingsPreservingKeys(existing, incoming);
        finalContent = JSON.stringify(merged, null, 2);
      }
    } catch {
      // If parsing fails, save raw content
    }
  }

  await fs.promises.writeFile(filePath, finalContent, 'utf-8');
}

/**
 * Get settings state with API keys sanitized.
 * @returns {Promise<object|null>} Parsed settings object or null
 */
export async function getSettingsState() {
  try {
    const raw = await loadAppState('settings-store');
    const parsed = JSON.parse(raw);
    // The Rust code stores with a {state: {...}} wrapper for zustand persist
    const state = parsed.state || parsed;
    return sanitizeSettingsState(state);
  } catch {
    return null;
  }
}

/**
 * Get raw settings (with API keys intact) for server-side LLM calls.
 * @returns {Promise<object|null>}
 */
export async function getRawSettingsState() {
  try {
    const raw = await loadAppState('settings-store');
    const parsed = JSON.parse(raw);
    return parsed.state || parsed;
  } catch {
    return null;
  }
}