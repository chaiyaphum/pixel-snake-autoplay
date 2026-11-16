import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_SAFE_SCORE } from '../../src/core/grid.js';
import { simulateToTarget } from '../../src/simulation/simulate.js';

test('zero, small, and bounded simulations stop at the requested boundary', () => {
  const zero = simulateToTarget({ targetScore: 0 });
  assert.equal(zero.steps, 0);
  assert.equal(zero.outcome, 'target-reached');
  const firstFood = simulateToTarget({ targetScore: 10 });
  assert.equal(firstFood.score, 10);
  assert.equal(firstFood.steps, 5);
  assert.equal(firstFood.outcome, 'target-reached');
  const limited = simulateToTarget({ targetScore: 10, maxSteps: 1 });
  assert.equal(limited.score, 0);
  assert.equal(limited.steps, 1);
  assert.equal(limited.outcome, 'step-limit');
  assert.throws(() => simulateToTarget({ maxSteps: -1 }), RangeError);
});

test(
  'one hundred deterministic seeds reach the default target without collisions',
  { timeout: 120_000 },
  (t) => {
    let minimum = Infinity;
    let maximum = 0;
    let switches = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      const result = simulateToTarget({ seed });
      assert.equal(result.outcome, 'target-reached', `seed ${seed}`);
      assert.equal(result.score, 3010, `seed ${seed}`);
      assert.equal(result.body.length, 304);
      assert.equal(result.status, 'playing');
      assert.equal(result.collision, null);
      minimum = Math.min(minimum, result.steps);
      maximum = Math.max(maximum, result.steps);
      switches += result.cycleSwitches;
    }
    assert.ok(switches > 0, 'the seeded suite must exercise excluded-cell exchanges');
    t.diagnostic(
      `100 seeds reached 3010 in ${minimum}-${maximum} moves; ${switches} excluded-cell exchanges.`,
    );
  },
);

test('repeated seeds produce identical runs', () => {
  assert.deepEqual(
    simulateToTarget({ seed: 42, targetScore: 100 }),
    simulateToTarget({ seed: 42, targetScore: 100 }),
  );
});

test('the maximum safe score stops before full-board food placement', { timeout: 30_000 }, () => {
  const result = simulateToTarget({ seed: 7, targetScore: MAX_SAFE_SCORE });
  assert.equal(result.outcome, 'target-reached');
  assert.equal(result.score, 4370);
  assert.equal(result.body.length, 440);
  assert.equal(result.status, 'playing');
  assert.equal(result.body.includes(result.food), false);
});
