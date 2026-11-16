/** The planner deliberately supports one board shape: 21 by 21 cells. */
export const GRID_WIDTH = 21;
export const GRID_HEIGHT = 21;
export const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;
export const POINTS_PER_FOOD = 10;
export const INITIAL_LENGTH = 3;
export const INITIAL_BODY = Object.freeze([220, 219, 218]);
export const INITIAL_FOOD = 225;
export const DEFAULT_TARGET_SCORE = 3010;
export const MAX_SAFE_SCORE = (CELL_COUNT - INITIAL_LENGTH - 1) * POINTS_PER_FOOD;
export const FULL_BOARD_SCORE = (CELL_COUNT - INITIAL_LENGTH) * POINTS_PER_FOOD;

/** @param {unknown} value @returns {value is number} */
export function isCell(value) {
  return Number.isInteger(value) && value >= 0 && value < CELL_COUNT;
}

/** @param {number} cell @returns {void} */
export function assertCell(cell) {
  if (!isCell(cell)) throw new RangeError(`Cell must be an integer from 0 to ${CELL_COUNT - 1}.`);
}

/** @param {number} x @param {number} y @returns {number} */
export function cellId(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= GRID_WIDTH ||
    y < 0 ||
    y >= GRID_HEIGHT
  ) {
    throw new RangeError('Coordinates must be integers inside the 21 by 21 board.');
  }
  return y * GRID_WIDTH + x;
}

/** @param {number} cell @returns {{x: number, y: number}} */
export function coordinates(cell) {
  assertCell(cell);
  return { x: cell % GRID_WIDTH, y: Math.floor(cell / GRID_WIDTH) };
}

/** Invalid cells and row-wrapping pairs are never adjacent.
 * @param {number} first @param {number} second @returns {boolean}
 */
export function areAdjacent(first, second) {
  return (
    isCell(first) &&
    isCell(second) &&
    Math.abs((first % GRID_WIDTH) - (second % GRID_WIDTH)) +
      Math.abs(Math.floor(first / GRID_WIDTH) - Math.floor(second / GRID_WIDTH)) ===
      1
  );
}

/** @param {number} cell @returns {number[]} */
export function neighbors(cell) {
  assertCell(cell);
  return [cell - GRID_WIDTH, cell + GRID_WIDTH, cell - 1, cell + 1].filter((candidate) =>
    areAdjacent(cell, candidate),
  );
}

/** @param {number} targetScore @returns {void} */
export function assertTargetScore(targetScore) {
  if (
    !Number.isInteger(targetScore) ||
    targetScore < 0 ||
    targetScore > MAX_SAFE_SCORE ||
    targetScore % POINTS_PER_FOOD !== 0
  ) {
    throw new RangeError(
      `Target score must be a multiple of ${POINTS_PER_FOOD} from 0 to ${MAX_SAFE_SCORE}.`,
    );
  }
}

/** @param {number} length @returns {number} */
export function scoreForLength(length) {
  if (!Number.isInteger(length) || length < INITIAL_LENGTH || length > CELL_COUNT) {
    throw new RangeError(`Body length must be from ${INITIAL_LENGTH} to ${CELL_COUNT}.`);
  }
  return (length - INITIAL_LENGTH) * POINTS_PER_FOOD;
}

/** Validate an ordered head-to-tail body and build its occupancy bitmap.
 * @param {number[]} body
 * @returns {Uint8Array}
 */
export function validateBody(body) {
  if (!Array.isArray(body)) throw new TypeError('Body must be an array of cell IDs.');
  scoreForLength(body.length);
  const occupied = new Uint8Array(CELL_COUNT);
  for (let index = 0; index < body.length; index += 1) {
    const cell = body[index];
    assertCell(cell);
    if (occupied[cell]) throw new RangeError('Body cells must be unique.');
    if (index > 0 && !areAdjacent(body[index - 1], cell)) {
      throw new RangeError('Consecutive body cells must be orthogonally adjacent.');
    }
    occupied[cell] = 1;
  }
  return occupied;
}
