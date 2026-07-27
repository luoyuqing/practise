/**
 * Web-mode stubs for @tauri-apps modules.
 *
 * When building for web (not Tauri), we alias these modules to this file
 * via Vite resolve.alias. This avoids runtime errors from Tauri-specific
 * APIs that don't have web equivalents.
 */

// --- @tauri-apps/api/core stub ---
export function invoke(cmd, _args) {
  // Route through appInvoke's HTTP mapping for commands that have it
  // But for direct invoke() calls without the appInvoke wrapper, just reject
  return Promise.reject(new Error(`Tauri command "${cmd}" is not available in web mode`));
}

// --- @tauri-apps/api/event stub ---
export function listen(_event, _handler) {
  return Promise.resolve(() => {});
}

export function emit(_event, _payload) {
  return Promise.resolve();
}

export function once(_event, _handler) {
  return Promise.resolve(() => {});
}

// --- @tauri-apps/plugin-dialog stub ---
export function open(_options) {
  return Promise.reject(new Error('File dialog is not available in web mode'));
}

export function save(_options) {
  return Promise.reject(new Error('File save dialog is not available in web mode'));
}

export function message(_msg, _options) {
  return Promise.resolve();
}

export function ask(_msg, _options) {
  return Promise.resolve(false);
}

export function confirm(_msg, _options) {
  return Promise.resolve(false);
}