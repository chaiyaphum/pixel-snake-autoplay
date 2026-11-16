import test from 'node:test';
import assert from 'node:assert/strict';
import { createController, install } from '../../src/browser/controller.js';
import { createFakeBrowser } from '../helpers/fake-browser.js';

test('installation is inert and a complete accelerated round reaches exactly 3010 through game moves', () => {
  const browser = createFakeBrowser({ seed: 42 });
  const originalInterval = browser.window.setInterval;
  const controller = createController({ tickMs: 4 }, browser);
  assert.equal(controller.status().phase, 'idle');
  assert.equal(browser.replay.clicks, 0);
  controller.start();
  assert.equal(browser.window.setInterval, originalInterval);
  browser.advance(50000);
  assert.deepEqual(controller.status(), {
    phase: 'completed',
    score: 3010,
    targetScore: 3010,
    ticks: browser.game.steps,
    tickMs: 4,
    reason: null,
  });
  assert.deepEqual(browser.submittedScores, [3010]);
  assert.equal(browser.timers.size, 0);
  assert.ok(browser.game.steps > 301);
  assert.ok(browser.inputs.every((event) => event.code.startsWith('Arrow')));
});

test('default clock remains at normal speed and can restart a completed round', () => {
  const browser = createFakeBrowser();
  const controller = createController({ targetScore: 10 }, browser);
  controller.start();
  assert.equal([...browser.timers.values()][0].delay, 110);
  browser.advance(1000);
  assert.equal(controller.status().score, 10);
  controller.start();
  browser.advance(1000);
  assert.deepEqual(browser.submittedScores, [10, 10]);
});

test('stop immediately ceases input and returns the existing round to normal cadence', () => {
  const browser = createFakeBrowser();
  const controller = createController({ tickMs: 4 }, browser);
  controller.start();
  browser.advance(2);
  controller.stop();
  const count = browser.inputs.length;
  const steps = browser.game.steps;
  browser.advance(27);
  assert.equal(browser.game.steps, steps);
  browser.advance(1);
  assert.equal(browser.game.steps, steps + 1);
  assert.equal(browser.inputs.length, count);
  assert.equal(controller.status().phase, 'stopped');
  browser.advance(1000);
  assert.equal(browser.timers.size, 0);
});

test('closing the modal prevents further movement inputs', () => {
  const browser = createFakeBrowser();
  const controller = createController({ tickMs: 4 }, browser);
  controller.start();
  browser.advance(1);
  browser.dialog.visible = false;
  const count = browser.inputs.length;
  browser.advance(20);
  assert.equal(browser.inputs.length, count);
  assert.match(controller.status().reason, /dialog was closed/);
});

test('destroy is idempotent and invalidates start/stop', () => {
  const browser = createFakeBrowser();
  const controller = createController({}, browser);
  controller.destroy();
  controller.destroy();
  assert.equal(controller.status().phase, 'destroyed');
  assert.throws(() => controller.start(), /destroyed/);
  assert.throws(() => controller.stop(), /destroyed/);
});

test('bad canvas observations fail closed and release accelerated pacing', () => {
  const browser = createFakeBrowser();
  const controller = createController({ tickMs: 4 }, browser);
  controller.start();
  browser.advance(1);
  browser.game.body = [224, 223, 222];
  const inputCount = browser.inputs.length;
  browser.advance(1);
  assert.equal(controller.status().phase, 'error');
  assert.match(controller.status().reason, /neighboring/);
  assert.equal(browser.inputs.length, inputCount);
});

test('score and body tampering are detected without changing game scores', () => {
  for (const corrupt of [
    (browser) => {
      browser.score.textContent = '20';
    },
    (browser) => {
      browser.game.body = [220, 219, 217];
    },
  ]) {
    const browser = createFakeBrowser();
    const controller = createController({}, browser);
    controller.start();
    corrupt(browser);
    browser.advance(1);
    assert.equal(controller.status().phase, 'error');
    assert.equal(browser.inputs.length, 0);
  }
});

test('closed games, invalid options, and missing browser environments are rejected', () => {
  const browser = createFakeBrowser();
  for (const tickMs of [0, 3, 111, NaN, 4.5, '4']) {
    assert.throws(() => createController({ tickMs }, browser), /tickMs/);
  }
  assert.throws(() => createController({ targetScore: 4380 }, browser));
  assert.throws(() => createController({}, {}), /environment/);
  const controller = createController({}, browser);
  browser.dialog.visible = false;
  assert.throws(() => controller.start(), /Open the game/);
});

test('a replay integration failure restores the interval function', () => {
  const browser = createFakeBrowser();
  browser.replay.click = () => {};
  const original = browser.window.setInterval;
  const controller = createController({}, browser);
  assert.throws(() => controller.start(), /expected 110/);
  assert.equal(controller.status().phase, 'error');
  assert.equal(browser.window.setInterval, original);
});

test('global install enforces ownership and permits reinstall after destroy', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    delete globalThis.window;
    assert.throws(() => install(), /browser game tab/);
    const browser = createFakeBrowser();
    globalThis.window = browser.window;
    const first = install({ targetScore: 10 });
    assert.throws(() => install(), /existing controller/);
    first.destroy();
    const second = install({ targetScore: 10 });
    second.start();
    browser.advance(1000);
    assert.equal(second.status().score, 10);
    second.destroy();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
});

test('zero target ends through a normal collision without eating food', () => {
  const browser = createFakeBrowser();
  const controller = createController({ targetScore: 0 }, browser);
  controller.start();
  browser.advance(1000);
  assert.equal(controller.status().phase, 'completed');
  assert.equal(browser.game.score, 0);
});
