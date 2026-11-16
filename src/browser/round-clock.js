export const NORMAL_TICK_MS = 110;

/**
 * Capture only the new round's timer while replay runs synchronously.
 * Restore the global immediately, and retain the timer identity the game owns.
 */
export function startRoundClock({ window, replay, tickMs, beforeStep, afterStep }) {
  const original = window.setInterval;
  const now = () => window.performance.now();
  let released = false;
  let lastStep = now();
  let handle;
  let captures = 0;
  let before = beforeStep;
  let after = afterStep;

  const clock = {
    release() {
      released = true;
      lastStep = now();
      before = undefined;
      after = undefined;
    },
  };

  window.setInterval = function (callback, delay, ...args) {
    if (delay !== NORMAL_TICK_MS || typeof callback !== 'function') {
      return original.call(window, callback, delay, ...args);
    }
    captures++;
    if (captures > 1) throw new Error('Replay created more than one matching game timer');
    handle = original.call(
      window,
      () => {
        if (released && now() - lastStep < NORMAL_TICK_MS) return;
        if (before && before() === false) return;
        lastStep = now();
        callback(...args);
        if (after) after();
      },
      tickMs,
    );
    return handle;
  };
  try {
    replay();
    if (captures !== 1) throw new Error('Replay did not create the expected 110 ms game timer');
  } catch (error) {
    if (handle !== undefined) window.clearInterval(handle);
    throw error;
  } finally {
    window.setInterval = original;
  }
  return clock;
}
