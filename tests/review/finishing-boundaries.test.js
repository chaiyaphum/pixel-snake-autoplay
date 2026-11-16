import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseFinishingDirection, directionBetween } from '../../src/browser/finishing-move.js';
import { simulateToTarget } from '../../src/simulation/simulate.js';
import { createSnakeGame } from '../../src/simulation/snake-game.js';

test('finishing preserves the exact target at sparse, default, and maximum-safe boundaries', () => {
  const moves = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };
  for (const [targetScore, seed] of [
    [0, 1],
    [10, 1],
    [3010, 0],
    [4370, 7],
  ]) {
    const reached = simulateToTarget({ targetScore, seed });
    const game = createSnakeGame({ body: reached.body, food: reached.food, seed });
    let state = game.getState();
    while (state.status === 'playing' && state.steps < 882) {
      const direction = chooseFinishingDirection(state.body, state.food);
      assert.notEqual(direction, directionBetween(state.body[0], state.body[1]), 'never reverse');
      const [dx, dy] = moves[direction];
      const x = (state.body[0] % 21) + dx;
      const y = Math.floor(state.body[0] / 21) + dy;
      const next = x < 0 || x >= 21 || y < 0 || y >= 21 ? -1 : y * 21 + x;
      state = game.step(next);
      assert.equal(state.score, targetScore, `target ${targetScore} must not overshoot`);
    }
    assert.equal(state.status, 'collision', `target ${targetScore} must finish within the limit`);
  }
});
