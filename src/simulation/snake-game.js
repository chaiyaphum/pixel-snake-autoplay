import {
  CELL_COUNT,
  INITIAL_BODY,
  INITIAL_FOOD,
  POINTS_PER_FOOD,
  areAdjacent,
  assertCell,
  isCell,
  scoreForLength,
  validateBody,
} from '../core/grid.js';

/** A deterministic 32-bit generator for reproducible simulations.
 * @param {number} seed @returns {() => number}
 */
export function createSeededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer.');
  }
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * @typedef {object} GameState
 * @property {number[]} body Ordered head to tail.
 * @property {number | null} food Null only on a full board.
 * @property {number} score
 * @property {number} steps Attempted moves, including the final collision.
 * @property {'playing' | 'collision' | 'filled'} status
 * @property {'wall' | 'body' | null} collision
 */

/**
 * An independent transition model: a next cell is checked against the entire
 * current body, including its tail, before any tail removal. Food adds ten
 * points and one body cell. No wrapping is permitted.
 *
 * Unlike games that retry food placement forever on a full board, this model
 * records `filled` and terminates. It deliberately does not emulate keyboard
 * filtering, canvas rendering, browser timers, or server score persistence.
 * @param {{seed?: number, body?: number[], food?: number | null}} [options]
 * @returns {{getState(): GameState, step(nextCell: number): GameState}}
 */
export function createSnakeGame({ seed = 1, body = [...INITIAL_BODY], food = INITIAL_FOOD } = {}) {
  const occupied = validateBody(body);
  const random = createSeededRandom(seed);
  const cells = [...body];
  let score = scoreForLength(cells.length);
  let steps = 0;
  let collision = null;
  let status = cells.length === CELL_COUNT ? 'filled' : 'playing';
  if (status === 'filled') {
    if (food !== null) throw new RangeError('A full board cannot contain food.');
  } else {
    assertCell(food);
    if (occupied[food]) throw new RangeError('Food must occupy an empty cell.');
  }

  /** @returns {GameState} */
  function getState() {
    return { body: [...cells], food, score, steps, status, collision };
  }

  /** @param {number} nextCell @returns {GameState} */
  function step(nextCell) {
    if (status !== 'playing') throw new Error('Cannot step a finished game.');
    if (!Number.isInteger(nextCell)) throw new TypeError('Next cell must be an integer.');
    if (isCell(nextCell) && !areAdjacent(cells[0], nextCell)) {
      throw new RangeError('Next cell must be orthogonally adjacent to the head.');
    }
    steps += 1;
    if (!isCell(nextCell) || occupied[nextCell]) {
      status = 'collision';
      collision = isCell(nextCell) ? 'body' : 'wall';
      return getState();
    }

    cells.unshift(nextCell);
    occupied[nextCell] = 1;
    if (nextCell === food) {
      score += POINTS_PER_FOOD;
      if (cells.length === CELL_COUNT) {
        food = null;
        status = 'filled';
      } else {
        do food = Math.floor(random() * CELL_COUNT);
        while (occupied[food]);
      }
    } else {
      occupied[cells.pop()] = 0;
    }
    return getState();
  }

  return Object.freeze({ getState, step });
}
