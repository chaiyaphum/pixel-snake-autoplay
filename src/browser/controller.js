import { createCyclePlanner } from '../core/cycle-planner.js';
import { createCanvasAdapter } from './canvas-adapter.js';
import { chooseFinishingDirection, directionBetween } from './finishing-move.js';
import { NORMAL_TICK_MS, startRoundClock } from './round-clock.js';

const installations = new WeakMap();

/** Install one controller in the current window. This never starts a round automatically. */
export function install(options = {}) {
  const window = globalThis.window;
  if (!window?.document) throw new Error('Install the controller in a browser game tab');
  if (installations.has(window))
    throw new Error('Destroy the existing controller before reinstalling');
  const controller = createController(options, { window, document: window.document });
  const originalDestroy = controller.destroy;
  controller.destroy = () => {
    const result = originalDestroy();
    if (installations.get(window) === controller) installations.delete(window);
    return result;
  };
  installations.set(window, controller);
  return controller;
}

/** Create an independently testable controller with explicit browser dependencies. */
export function createController(options = {}, environment) {
  const { targetScore = 3010, tickMs = NORMAL_TICK_MS, selectors } = options;
  if (!Number.isInteger(tickMs) || tickMs < 4 || tickMs > NORMAL_TICK_MS) {
    throw new Error('tickMs must be an integer between 4 and 110');
  }
  const planner = createCyclePlanner({ targetScore });
  if (!environment?.window || !environment.document)
    throw new Error('A browser environment is required');
  const adapter = createCanvasAdapter({ ...environment, selectors });
  let phase = 'idle';
  let reason = null;
  let score = 0;
  let ticks = 0;
  let body = [220, 219, 218];
  let clock;
  let finishingTicks = 0;

  function status() {
    if (phase === 'running' || phase === 'finishing') {
      try {
        if (!adapter.isVisible()) {
          stopWith('stopped', 'The game dialog was closed');
        } else if (!adapter.isPlaying()) {
          score = adapter.readScore();
          stopWith('completed', score === targetScore ? null : 'The round ended before the target');
        }
      } catch (error) {
        stopWith('error', error.message);
      }
    }
    return { phase, score, targetScore, ticks, tickMs, reason };
  }

  function stopWith(nextPhase, message = null) {
    clock?.release();
    phase = nextPhase;
    reason = message;
  }

  function requireAlive() {
    if (phase === 'destroyed') throw new Error('This controller has been destroyed');
  }

  function observe() {
    const state = adapter.read();
    if (state.head !== body[0]) {
      directionBetween(body[0], state.head);
      if (state.score !== score && state.score !== score + 10) {
        throw new Error('Unexpected score change; the controller lost synchronization');
      }
      body.unshift(state.head);
      if (state.score === score) body.pop();
      ticks++;
    } else if (state.score !== score) {
      throw new Error('Score changed without a movement');
    }
    score = state.score;
    if (
      body.length !== 3 + score / 10 ||
      state.occupied.size !== body.length ||
      body.some((cell) => !state.occupied.has(cell))
    ) {
      throw new Error('Canvas body does not match the observed movement history');
    }
    return state;
  }

  function beforeStep() {
    try {
      if (!adapter.isVisible()) {
        stopWith('stopped', 'The game dialog was closed');
        return false;
      }
      if (!adapter.isPlaying()) {
        score = adapter.readScore();
        stopWith('completed', score === targetScore ? null : 'The round ended before the target');
        return false;
      }
      const state = observe();
      let direction;
      if (score >= targetScore) {
        phase = 'finishing';
        if (++finishingTicks > 882)
          throw new Error('Unable to finish the round within the movement limit');
        direction = chooseFinishingDirection(body, state.food);
      } else {
        direction = directionBetween(body[0], planner.next(body, state.food));
      }
      adapter.sendDirection(direction);
      return true;
    } catch (error) {
      stopWith('error', error.message);
      return false;
    }
  }

  function afterStep() {
    try {
      if (!adapter.isPlaying()) {
        score = adapter.readScore();
        stopWith('completed', score === targetScore ? null : 'The round ended before the target');
      }
    } catch (error) {
      stopWith('error', error.message);
    }
  }

  return {
    start() {
      requireAlive();
      if (!adapter.isVisible()) throw new Error('Open the game dialog before starting');
      clock?.release();
      planner.reset();
      body = [220, 219, 218];
      score = 0;
      ticks = 0;
      finishingTicks = 0;
      reason = null;
      phase = 'running';
      try {
        clock = startRoundClock({
          window: environment.window,
          replay: () => adapter.replay(),
          tickMs,
          beforeStep,
          afterStep,
        });
      } catch (error) {
        stopWith('error', error.message);
        throw error;
      }
      return status();
    },
    stop() {
      requireAlive();
      stopWith('stopped', 'Stopped by the caller');
      return status();
    },
    status,
    destroy() {
      stopWith('destroyed', 'Controller destroyed');
      return status();
    },
  };
}
