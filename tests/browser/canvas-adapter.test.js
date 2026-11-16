import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasAdapter } from '../../src/browser/canvas-adapter.js';
import { createFakeBrowser } from '../helpers/fake-browser.js';

test('reads only the expected canvas colors and supports explicit selector overrides', () => {
  const browser = createFakeBrowser();
  browser.elements['#custom-canvas'] = browser.canvas;
  const adapter = createCanvasAdapter({ ...browser, selectors: { canvas: '#custom-canvas' } });
  assert.deepEqual(adapter.read(), {
    head: 220,
    food: 225,
    occupied: new Set([218, 219, 220]),
    score: 0,
  });
  assert.equal(adapter.isVisible(), true);
  assert.equal(adapter.isPlaying(), false);
  adapter.replay();
  assert.equal(adapter.isPlaying(), true);
  adapter.sendDirection('ArrowDown');
  assert.equal(browser.inputs.length, 2);
  assert.throws(() => adapter.sendDirection('Enter'), /Unsupported/);
});

test('incompatible canvases and missing selectors are rejected', () => {
  const browser = createFakeBrowser();
  assert.throws(
    () => createCanvasAdapter({ ...browser, selectors: { canvas: '#absent' } }),
    /Missing/,
  );
  browser.canvas.width = 400;
  assert.throws(() => createCanvasAdapter(browser), /420/);
  browser.canvas.width = 420;
  browser.canvas.getContext = () => null;
  assert.throws(() => createCanvasAdapter(browser), /2D canvas/);
});

test('invalid scores, missing colors, duplicate heads, and duplicate foods fail clearly', () => {
  const browser = createFakeBrowser();
  const adapter = createCanvasAdapter(browser);
  for (const value of ['abc', '-10', '15', '1.5']) {
    browser.score.textContent = value;
    assert.throws(() => adapter.readScore(), /score label/);
  }
  browser.score.textContent = '0';
  const pixels = browser.context.getImageData().data.slice();
  const setPixel = (cell, color) => {
    const offset = ((Math.floor(cell / 21) * 20 + 10) * 420 + (cell % 21) * 20 + 10) * 4;
    pixels.set(color, offset);
  };
  browser.context.getImageData = () => ({ data: pixels });
  setPixel(0, [187, 247, 208]);
  assert.throws(() => adapter.read(), /Multiple snake heads/);
  setPixel(0, [248, 113, 113]);
  assert.throws(() => adapter.read(), /Multiple food/);
  pixels.fill(0);
  assert.throws(() => adapter.read(), /Unable to read/);
  browser.dialog.visible = false;
  assert.throws(() => adapter.replay(), /Open the game/);
});
