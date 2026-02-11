/**
 * Stream lifecycle diagnostics for provider clients.
 *
 * Tracks connection, iteration, event counts, and completion
 * to fill the observability gap between stream start and timeout/error.
 * All output is debug-level only.
 */

import { createLogger } from './debug.js';

export interface StreamDiagnostics {
  /** Call when the stream connection resolves (runStreamed / subscribe) */
  onConnected(): void;
  /** Call at the top of each for-await iteration (logs only on first call) */
  onFirstEvent(eventType: string): void;
  /** Call for each event to track count and last type (no log output) */
  onEvent(eventType: string): void;
  /** Call when the idle timeout callback fires (before abort) */
  onIdleTimeoutFired(): void;
  /** Call when error events are received (turn.failed, session.error, etc.) */
  onStreamError(eventType: string, message: string): void;
  /** Call on stream completion with reason */
  onCompleted(reason: 'normal' | 'timeout' | 'abort' | 'error', detail?: string): void;
}

export function createStreamDiagnostics(
  component: string,
  context: Record<string, unknown>,
): StreamDiagnostics {
  const log = createLogger(component);
  const startTime = Date.now();
  let eventCount = 0;
  let lastEventType = '';
  let lastEventTime = 0;
  let connected = false;
  let firstEventLogged = false;

  return {
    onConnected() {
      connected = true;
      log.debug('Stream connected', { ...context, elapsedMs: Date.now() - startTime });
    },

    onFirstEvent(eventType: string) {
      if (firstEventLogged) return;
      firstEventLogged = true;
      log.debug('Stream first event', { ...context, firstEventType: eventType, elapsedMs: Date.now() - startTime });
    },

    onEvent(eventType: string) {
      eventCount++;
      lastEventType = eventType;
      lastEventTime = Date.now();
    },

    onIdleTimeoutFired() {
      log.debug('Idle timeout fired', {
        ...context,
        eventCount,
        lastEventType,
        msSinceLastEvent: lastEventTime > 0 ? Date.now() - lastEventTime : undefined,
        connected,
        iterationStarted: firstEventLogged,
      });
    },

    onStreamError(eventType: string, message: string) {
      log.debug('Stream error event', { ...context, eventType, message, eventCount });
    },

    onCompleted(reason: 'normal' | 'timeout' | 'abort' | 'error', detail?: string) {
      log.debug('Stream completed', {
        ...context,
        reason,
        detail,
        eventCount,
        lastEventType,
        durationMs: Date.now() - startTime,
        connected,
        iterationStarted: firstEventLogged,
      });
    },
  };
}
