import assert from 'node:assert/strict';
import test from 'node:test';
import { createController } from '../../src/browser/controller.js';
import { createFakeBrowser } from '../helpers/fake-browser.js';

test('status reconciles a modal close even when the page already cleared its timer', () => {
  const browser = createFakeBrowser();
  const controller = createController({ tickMs: 4 }, browser);
  controller.start();
  browser.advance(2);
  browser.dialog.visible = false;
  for (const handle of browser.timers.keys()) browser.window.clearInterval(handle);
  const inputCount = browser.inputs.length;
  const state = controller.status();
  assert.equal(state.phase, 'stopped');
  assert.match(state.reason, /dialog was closed/);
  browser.advance(100);
  assert.equal(browser.inputs.length, inputCount);
  controller.destroy();
});

test('status observes an external round end without another controller timer callback', () => {
  const browser = createFakeBrowser();
  const controller = createController({ targetScore: 10, tickMs: 4 }, browser);
  controller.start();
  browser.advance(5);
  assert.equal(browser.game.score, 10);
  browser.game.over = true;
  browser.replay.style.display = '';
  for (const handle of browser.timers.keys()) browser.window.clearInterval(handle);
  const state = controller.status();
  assert.equal(state.phase, 'completed');
  assert.equal(state.score, 10);
  assert.equal(state.reason, null);
  controller.destroy();
});
