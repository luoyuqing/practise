/**
 * Tauri API polyfill for web deployment.
 *
 * In non-Tauri environments (web browser), the @tauri-apps/api modules
 * will still be imported but `invoke` and `listen` will throw at call time.
 * This polyfill patches the global `__TAURI_INTERNALS__` to provide
 * no-op fallbacks so that components that directly call `invoke()` don't
 * crash the entire app — they just get an error in their try/catch.
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: any;
    __TAURI__?: any;
    __TAURI_IPC__?: any;
  }
}

let installed = false;

export function installTauriPolyfill(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;

  // If real Tauri internals exist, don't install polyfill
  if (window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_IPC__) {
    return;
  }

  // Install a minimal polyfill that makes invoke() reject gracefully
  window.__TAURI_INTERNALS__ = {
    invoke: (_cmd: string, _args?: object) => {
      return Promise.reject(new Error('Tauri not available in web mode'));
    },
    // The event system polyfill
    transformCallback: () => 0,
  };

  installed = true;
}

// Auto-install on module load (browser only)
if (typeof window !== 'undefined') {
  installTauriPolyfill();
}

export {};