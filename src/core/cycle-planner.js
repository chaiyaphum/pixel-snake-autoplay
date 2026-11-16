import {
  CELL_COUNT,
  DEFAULT_TARGET_SCORE,
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_LENGTH,
  MAX_SAFE_SCORE,
  POINTS_PER_FOOD,
  areAdjacent,
  assertCell,
  assertTargetScore,
  scoreForLength,
  validateBody,
} from './grid.js';

const CYCLE_LENGTH = CELL_COUNT - 1;
const FIRST_EXCLUDED_CELL = 0;
const ALTERNATE_EXCLUDED_CELL = GRID_WIDTH + 1;

/**
 * Build a circuit on the bottom 20 rows, then add ten two-cell detours
 * across the top row. Reversing it accommodates the initial rightward body.
 * The circuit visits every cell except the top-left corner.
 * @returns {number[]}
 */
function buildCycle() {
  const base = [GRID_WIDTH];
  for (let y = 1; y < GRID_HEIGHT; y += 1) {
    for (let offset = 0; offset < GRID_WIDTH - 1; offset += 1) {
      const x = y % 2 === 1 ? offset + 1 : GRID_WIDTH - 1 - offset;
      base.push(y * GRID_WIDTH + x);
    }
  }
  for (let y = GRID_HEIGHT - 1; y >= 2; y -= 1) base.push(y * GRID_WIDTH);

  const cycle = [];
  base.forEach((cell, index) => {
    const next = base[(index + 1) % base.length];
    cycle.push(cell);
    if (
      Math.floor(cell / GRID_WIDTH) === 1 &&
      Math.floor(next / GRID_WIDTH) === 1 &&
      (cell % GRID_WIDTH) % 2 === 1 &&
      next === cell + 1
    ) {
      cycle.push(cell - GRID_WIDTH, next - GRID_WIDTH);
    }
  });
  return cycle.reverse();
}

/**
 * @typedef {object} PlannerDescription
 * @property {number} targetScore
 * @property {number} targetLength
 * @property {number} excludedCell
 * @property {number} switchCount
 * @property {number[]} cycle A defensive copy, ordered in the travel direction.
 */

/**
 * Plan legal next cells without changing the game, its score, or its timing.
 *
 * A 21 by 21 board cannot have a circuit through all 441 cells. Two circuits
 * of length 440 differ only at one diagonal pair. If food occupies the excluded
 * cell, exchanging that pair once its old vertex is empty makes food reachable.
 *
 * Shortcuts preserve circular body order. Their free forward arc reserves one
 * cell for each remaining growth, plus a terminal gap. Thus even an adversarial
 * sequence of foods cannot trap the snake before the requested target.
 *
 * The caller must retain ordered body observations and stop at the target.
 * Arbitrary mid-game bodies are rejected when they violate these invariants.
 * @param {{targetScore?: number}} [options]
 * @returns {{next(body: number[], food: number): number, reset(): void, describe(): PlannerDescription}}
 */
export function createCyclePlanner({ targetScore = DEFAULT_TARGET_SCORE } = {}) {
  assertTargetScore(targetScore);
  const targetLength = INITIAL_LENGTH + targetScore / POINTS_PER_FOOD;
  // At 4370 the 440-cell circuit is full; the caller stops immediately.
  const terminalGap = targetScore === MAX_SAFE_SCORE ? 1 : 2;
  let cycle;
  let positions;
  let exchangeIndex;
  let excludedCell;
  let switchCount;

  function reset() {
    cycle = buildCycle();
    positions = new Int16Array(CELL_COUNT).fill(-1);
    cycle.forEach((cell, index) => {
      positions[cell] = index;
    });
    exchangeIndex = positions[ALTERNATE_EXCLUDED_CELL];
    excludedCell = FIRST_EXCLUDED_CELL;
    switchCount = 0;
  }

  /** @param {number} from @param {number} to */
  const distance = (from, to) => (positions[to] - positions[from] + CYCLE_LENGTH) % CYCLE_LENGTH;

  /** @param {number[]} body @param {number} food @returns {number} */
  function next(body, food) {
    const occupied = validateBody(body);
    assertCell(food);
    if (occupied[food]) throw new RangeError('Food must occupy an empty cell.');
    const score = scoreForLength(body.length);
    if (score >= targetScore)
      throw new RangeError('The target score has already been reached; stop playing.');

    const head = body[0];
    const tail = body[body.length - 1];
    let previousDistance = CYCLE_LENGTH;
    for (let index = 0; index < body.length; index += 1) {
      const cell = body[index];
      if (positions[cell] < 0)
        throw new RangeError('Body occupies the excluded cell; reset only at a new game.');
      if (index > 0) {
        const currentDistance = distance(head, cell);
        if (currentDistance >= previousDistance) {
          throw new RangeError('Body does not preserve the planner cycle order.');
        }
        previousDistance = currentDistance;
      }
    }
    if (distance(head, tail) < targetLength - body.length + terminalGap) {
      throw new RangeError('Body has insufficient forward space for the target score.');
    }

    if (food === excludedCell) {
      const oldCell = cycle[exchangeIndex];
      if (!occupied[oldCell]) {
        cycle[exchangeIndex] = excludedCell;
        positions[excludedCell] = exchangeIndex;
        positions[oldCell] = -1;
        excludedCell = oldCell;
        switchCount += 1;
      }
    }

    let chosen = cycle[(positions[head] + 1) % CYCLE_LENGTH];
    if (food !== excludedCell) {
      const foodDistance = distance(head, food);
      const tailDistance = distance(head, tail);
      let bestDistance = 0;
      for (const candidate of [head - GRID_WIDTH, head + GRID_WIDTH, head - 1, head + 1]) {
        if (!areAdjacent(head, candidate) || occupied[candidate] || positions[candidate] < 0)
          continue;
        const advance = distance(head, candidate);
        const grows = candidate === food;
        const nextLength = body.length + Number(grows);
        const nextTail = grows ? tail : body[body.length - 2];
        const nextGap = distance(candidate, nextTail);
        const reserve = targetLength - nextLength + terminalGap;
        if (
          advance > bestDistance &&
          advance < tailDistance &&
          advance <= foodDistance &&
          nextGap >= reserve
        ) {
          bestDistance = advance;
          chosen = candidate;
        }
      }
    }
    if (!areAdjacent(head, chosen) || occupied[chosen]) {
      throw new Error('Planner invariant violated: no legal next cell.');
    }
    return chosen;
  }

  function describe() {
    return { targetScore, targetLength, excludedCell, switchCount, cycle: [...cycle] };
  }

  reset();
  return Object.freeze({ next, reset, describe });
}
