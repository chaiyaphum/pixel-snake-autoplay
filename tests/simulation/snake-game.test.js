import assert from 'node:assert/strict';
import test from 'node:test';
import { FULL_BOARD_SCORE, INITIAL_BODY } from '../../src/core/grid.js';
import { createSeededRandom, createSnakeGame } from '../../src/simulation/snake-game.js';

test('ordinary movement preserves length and eating adds ten points and one cell', () => {
  const game = createSnakeGame({ seed: 7 });
  for (let next = 221; next <= 224; next += 1) {
    const state = game.step(next);
    assert.equal(state.score, 0);
    assert.equal(state.body.length, 3);
  }
  const state = game.step(225);
  assert.equal(state.score, 10);
  assert.equal(state.body.length, 4);
  assert.equal(state.steps, 5);
  assert.equal(state.body.includes(state.food), false);
});

test('entering the current tail collides before the tail could be removed', () => {
  const body = [22, 23, 44, 43];
  const game = createSnakeGame({ body, food: 0 });
  const state = game.step(43);
  assert.equal(state.status, 'collision');
  assert.equal(state.collision, 'body');
  assert.deepEqual(state.body, body);
  assert.equal(state.score, 10);
  assert.throws(() => game.step(21), /finished game/);
});

test('wall collisions terminate and invalid nonadjacent moves are rejected', () => {
  const game = createSnakeGame({ body: [0, 1, 2], food: 4 });
  assert.throws(() => game.step(5), /adjacent/);
  assert.throws(() => game.step(0.5), TypeError);
  assert.equal(game.getState().steps, 0);
  assert.equal(game.step(-1).collision, 'wall');
});

test('filling the board terminates before trying to place impossible food', () => {
  const path = [];
  for (let y = 0; y < 21; y += 1) {
    for (let offset = 0; offset < 21; offset += 1) {
      path.push(y * 21 + (y % 2 === 0 ? offset : 20 - offset));
    }
  }
  const game = createSnakeGame({ body: path.slice(1), food: 0 });
  const state = game.step(0);
  assert.equal(state.status, 'filled');
  assert.equal(state.score, FULL_BOARD_SCORE);
  assert.equal(state.body.length, 441);
  assert.equal(state.food, null);
  assert.throws(() => game.step(1), /finished game/);
});

test('snapshots and caller-owned arrays cannot mutate simulation state', () => {
  const body = [...INITIAL_BODY];
  const game = createSnakeGame({ body });
  body[0] = 0;
  const snapshot = game.getState();
  snapshot.body[0] = 1;
  assert.deepEqual(game.getState().body, INITIAL_BODY);
  assert.throws(() => createSnakeGame({ food: 220 }), /empty cell/);
});

test('seeded randomness is reproducible and bounded', () => {
  const first = createSeededRandom(0);
  const second = createSeededRandom(0);
  const other = createSeededRandom(1);
  const values = Array.from({ length: 100 }, first);
  assert.deepEqual(values, Array.from({ length: 100 }, second));
  assert.notDeepEqual(values, Array.from({ length: 100 }, other));
  assert.ok(values.every((value) => value >= 0 && value < 1));
  for (const seed of [-1, 0x100000000, 1.5, NaN])
    assert.throws(() => createSeededRandom(seed), RangeError);
});
