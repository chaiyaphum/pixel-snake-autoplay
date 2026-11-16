import test from 'node:test';
import assert from 'node:assert/strict';
import { startRoundClock } from '../../src/browser/round-clock.js';
import { createFakeBrowser } from '../helpers/fake-browser.js';

test('clock observes before movement, passes arguments, and leaves unrelated timers alone', () => {
  const { window, advance, timers } = createFakeBrowser();
  const calls = [];
  const original = window.setInterval;
  startRoundClock({
    window,
    tickMs: 4,
    replay() {
      window.setInterval((value) => calls.push(value), 110, 'game');
      window.setInterval(() => calls.push('other'), 50);
    },
    beforeStep: () => calls.push('before'),
    afterStep: () => calls.push('after'),
  });
  assert.equal(window.setInterval, original);
  assert.deepEqual(
    [...timers.values()].map((timer) => timer.delay),
    [4, 50],
  );
  advance();
  assert.deepEqual(calls, ['before', 'game', 'after']);
});

test('startup failures restore globals and remove partially captured timers', () => {
  for (const mode of ['none', 'throw', 'duplicate']) {
    const { window, timers } = createFakeBrowser();
    const original = window.setInterval;
    assert.throws(() =>
      startRoundClock({
        window,
        tickMs: 4,
        replay() {
          if (mode === 'none') return;
          window.setInterval(() => {}, 110);
          if (mode === 'throw') throw new Error('Replay failed');
          window.setInterval(() => {}, 110);
        },
      }),
    );
    assert.equal(window.setInterval, original);
    assert.equal(timers.size, 0);
  }
});
