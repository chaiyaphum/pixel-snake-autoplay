import assert from 'node:assert/strict';
import test from 'node:test';
import { install } from '../../src/browser/controller.js';
import { createFakeBrowser } from '../helpers/fake-browser.js';

test('destroying a stale controller cannot release the current installation owner', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let current;
  try {
    globalThis.window = createFakeBrowser().window;
    const first = install({ targetScore: 10 });
    assert.equal(first.destroy().phase, 'destroyed');
    current = install({ targetScore: 10 });
    assert.equal(first.destroy().phase, 'destroyed');
    assert.throws(() => install(), /existing controller/);
    current.destroy();
    current = install({ targetScore: 10 });
    assert.equal(current.status().phase, 'idle');
  } finally {
    current?.destroy();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
});
