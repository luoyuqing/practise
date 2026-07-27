import { v4 as uuidv4 } from 'uuid';

/**
 * Manages active SSE streams.
 * Each stream is an async generator stored in a map, keyed by runId.
 * The SSE endpoint (/api/mobile/stream) subscribes to these generators.
 */
class StreamManager {
  constructor() {
    this.activeStreams = new Map(); // runId -> { generator, controller }
  }

  /**
   * Register a new stream.
   * @param {string} runId
   * @param {AsyncGenerator} generator
   * @param {AbortController} controller
   */
  register(runId, generator, controller) {
    this.activeStreams.set(runId, { generator, controller });
  }

  /**
   * Get a stream by runId.
   */
  get(runId) {
    return this.activeStreams.get(runId);
  }

  /**
   * Stop and remove a stream.
   */
  stop(runId) {
    const entry = this.activeStreams.get(runId);
    if (entry) {
      entry.controller?.abort();
      this.activeStreams.delete(runId);
      return true;
    }
    return false;
  }

  /**
   * Clean up a stream after completion.
   */
  cleanup(runId) {
    this.activeStreams.delete(runId);
  }

  /**
   * Generate a new run ID.
   */
  static newRunId() {
    return uuidv4();
  }
}

export { StreamManager };
export const streamManager = new StreamManager();