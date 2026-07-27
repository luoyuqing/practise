import fs from 'fs';
import path from 'path';
import { resolveSessionsDir, sanitizeSessionId, nowMillis } from './utils.js';

/**
 * List agent sessions with optional prefix and sessionKind filters.
 * Returns summaries sorted by savedAt descending.
 */
export async function listSessions(prefix, sessionKind) {
  const dir = resolveSessionsDir();
  await fs.promises.mkdir(dir, { recursive: true });

  const entries = await fs.promises.readdir(dir);
  const summaries = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const filePath = path.join(dir, entry);
    try {
      const text = await fs.promises.readFile(filePath, 'utf-8');
      const record = JSON.parse(text);
      if (!sessionMatchesFilters(record, prefix, sessionKind)) continue;
      summaries.push(sessionSummary(record));
    } catch {
      continue;
    }
  }

  summaries.sort((a, b) => b.savedAt - a.savedAt);
  return summaries;
}

function sessionMatchesFilters(record, prefix, sessionKind) {
  if (prefix && !record.id.startsWith(prefix)) return false;
  if (sessionKind) {
    const recordKind = record.sessionKind || null;
    let matches;
    if (sessionKind === 'story') {
      matches = recordKind === 'story' || recordKind === null;
    } else {
      matches = recordKind === sessionKind;
    }
    if (!matches) return false;
  }
  return true;
}

function sessionSummary(record) {
  return {
    id: record.id,
    title: record.title,
    savedAt: record.savedAt,
    sessionKind: record.sessionKind || null,
    characterCardId: record.characterCardId || null,
    characterCardIds: record.characterCardIds || null,
    selectedWorldBookId: record.selectedWorldBookId || null,
    dynamicRoleLoadingEnabled: record.dynamicRoleLoadingEnabled || null,
  };
}

/**
 * Load a single agent session by ID.
 */
export async function loadSession(id) {
  const dir = resolveSessionsDir();
  const safeId = sanitizeSessionId(id);
  const filePath = path.join(dir, `${safeId}.json`);
  const text = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(text);
}

/**
 * Save an agent session. Updates savedAt timestamp.
 */
export async function saveSession(session) {
  const dir = resolveSessionsDir();
  await fs.promises.mkdir(dir, { recursive: true });

  const record = { ...session };
  record.savedAt = nowMillis();
  const safeId = sanitizeSessionId(record.id);
  const filePath = path.join(dir, `${safeId}.json`);
  const text = JSON.stringify(record, null, 2);
  await fs.promises.writeFile(filePath, text, 'utf-8');
  return sessionSummary(record);
}

/**
 * Delete an agent session by ID.
 */
export async function deleteSession(id) {
  const dir = resolveSessionsDir();
  const safeId = sanitizeSessionId(id);
  const filePath = path.join(dir, `${safeId}.json`);
  try {
    await fs.promises.unlink(filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

/**
 * Update session title.
 */
export async function updateSessionTitle(id, title) {
  const dir = resolveSessionsDir();
  const safeId = sanitizeSessionId(id);
  const filePath = path.join(dir, `${safeId}.json`);
  const text = await fs.promises.readFile(filePath, 'utf-8');
  const record = JSON.parse(text);
  record.title = title;
  record.savedAt = nowMillis();
  const updated = JSON.stringify(record, null, 2);
  await fs.promises.writeFile(filePath, updated, 'utf-8');
  return sessionSummary(record);
}