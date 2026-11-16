import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseFinishingDirection, directionBetween } from '../../src/browser/finishing-move.js';

test('movement rejects wrapping and non-neighbor cells', () => {
  assert.equal(directionBetween(220, 199), 'ArrowUp');
  assert.equal(directionBetween(220, 241), 'ArrowDown');
  assert.equal(directionBetween(220, 219), 'ArrowLeft');
  assert.equal(directionBetween(220, 221), 'ArrowRight');
  assert.throws(() => directionBetween(20, 21));
  assert.throws(() => directionBetween(220, 222));
});

test('finishing uses a wall or body collision and avoids reversal and food', () => {
  assert.equal(chooseFinishingDirection([0, 1, 2], 21), 'ArrowUp');
  assert.equal(chooseFinishingDirection([220, 219, 198, 199], 225), 'ArrowUp');
  const direction = chooseFinishingDirection([220, 219, 218], 199);
  assert.notEqual(direction, 'ArrowUp');
  assert.notEqual(direction, 'ArrowLeft');
});
