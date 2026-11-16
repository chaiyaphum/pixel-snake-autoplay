import { createCyclePlanner } from '../core/cycle-planner.js';
import { DEFAULT_TARGET_SCORE, assertTargetScore } from '../core/grid.js';
import { createSnakeGame } from './snake-game.js';

/** Run the planner against an independent deterministic transition model.
 * @param {{seed?: number, targetScore?: number, maxSteps?: number}} [options]
 * @returns {import('./snake-game.js').GameState & {
 *   seed: number, targetScore: number, outcome: 'target-reached' | 'step-limit' | 'collision' | 'filled',
 *   cycleSwitches: number
 * }}
 */
export function simulateToTarget({
  seed = 1,
  targetScore = DEFAULT_TARGET_SCORE,
  maxSteps = 1_000_000,
} = {}) {
  assertTargetScore(targetScore);
  if (!Number.isInteger(maxSteps) || maxSteps < 0)
    throw new RangeError('maxSteps must be a nonnegative integer.');
  const game = createSnakeGame({ seed });
  const planner = createCyclePlanner({ targetScore });
  let state = game.getState();
  while (state.status === 'playing' && state.score < targetScore && state.steps < maxSteps) {
    state = game.step(planner.next(state.body, state.food));
  }
  const outcome =
    state.score >= targetScore
      ? 'target-reached'
      : state.status === 'playing'
        ? 'step-limit'
        : state.status;
  return { ...state, seed, targetScore, outcome, cycleSwitches: planner.describe().switchCount };
}
