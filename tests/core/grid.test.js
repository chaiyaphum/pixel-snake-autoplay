import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CELL_COUNT,
  FULL_BOARD_SCORE,
  INITIAL_BODY,
  MAX_SAFE_SCORE,
  areAdjacent,
  assertTargetScore,
  cellId,
  coordinates,
  neighbors,
  scoreForLength,
  validateBody,
} from '../../src/core/grid.js';

test('cell coordinates round-trip over the supported board', () => {
  for (let cell = 0; cell < CELL_COUNT; cell += 1) {
    const { x, y } = coordinates(cell);
    assert.equal(cellId(x, y), cell);
  }
  assert.deepEqual(neighbors(0), [21, 1]);
  assert.equal(areAdjacent(20, 21), false, 'row edges must not wrap');
  assert.equal(areAdjacent(0, -1), false);
  assert.throws(() => coordinates(441), RangeError);
  assert.throws(() => cellId(21, 0), RangeError);
  assert.throws(() => cellId(0.5, 0), RangeError);
});

test('score limits distinguish the last safe target from a full board', () => {
  assert.equal(MAX_SAFE_SCORE, 4370);
  assert.equal(FULL_BOARD_SCORE, 4380);
  assert.equal(scoreForLength(3), 0);
  assert.equal(scoreForLength(440), MAX_SAFE_SCORE);
  assert.equal(scoreForLength(441), FULL_BOARD_SCORE);
  for (const target of [0, 10, 3010, 4370]) assert.doesNotThrow(() => assertTargetScore(target));
  for (const target of [-10, 1, 10.5, 4380, NaN, Infinity, '10']) {
    assert.throws(() => assertTargetScore(target), RangeError);
  }
});

test('body validation rejects malformed observations and leaves inputs unchanged', () => {
  const body = [...INITIAL_BODY];
  const occupied = validateBody(body);
  assert.deepEqual(body, INITIAL_BODY);
  assert.equal(
    occupied.reduce((sum, value) => sum + value, 0),
    3,
  );
  assert.throws(() => validateBody(null), TypeError);
  for (const invalid of [
    [0, 1],
    [0, 1, 0],
    [0, 1, 23],
    [0, 1, 441],
    [0, 1, 2.5],
  ]) {
    assert.throws(() => validateBody(invalid), RangeError);
  }
});
