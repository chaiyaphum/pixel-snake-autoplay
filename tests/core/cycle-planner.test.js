import assert from 'node:assert/strict';
import test from 'node:test';
import { createCyclePlanner } from '../../src/core/cycle-planner.js';
import { INITIAL_BODY, INITIAL_FOOD, areAdjacent } from '../../src/core/grid.js';

function assertCircuit(description) {
  const { cycle, excludedCell } = description;
  assert.equal(cycle.length, 440);
  assert.equal(new Set(cycle).size, 440);
  assert.equal(cycle.includes(excludedCell), false);
  cycle.forEach((cell, index) => assert.ok(areAdjacent(cell, cycle[(index + 1) % cycle.length])));
}

test('the initial circuit is compatible with the initial rightward body', () => {
  const planner = createCyclePlanner();
  assertCircuit(planner.describe());
  assert.equal(planner.next([...INITIAL_BODY], INITIAL_FOOD), 221);
  const description = planner.describe();
  assert.equal(description.targetScore, 3010);
  assert.equal(description.targetLength, 304);
  assert.equal(description.excludedCell, 0);
  description.cycle[0] = -1;
  assertCircuit(planner.describe());
});

test('food in an excluded cell swaps circuits without modifying the observed body', () => {
  const planner = createCyclePlanner();
  const body = [...INITIAL_BODY];
  const next = planner.next(body, 0);
  assert.ok(areAdjacent(body[0], next));
  assert.equal(body.includes(next), false);
  assert.deepEqual(body, INITIAL_BODY);
  assert.equal(planner.describe().excludedCell, 22);
  assert.equal(planner.describe().switchCount, 1);
  assertCircuit(planner.describe());

  planner.next(body, 22);
  assert.equal(planner.describe().excludedCell, 0);
  assert.equal(planner.describe().switchCount, 2);
  assertCircuit(planner.describe());
  planner.reset();
  assert.equal(planner.describe().switchCount, 0);
  assert.equal(planner.describe().excludedCell, 0);
});

test('the excluded-cell exchange waits until its old vertex is empty', () => {
  const planner = createCyclePlanner({ targetScore: 10 });
  const { cycle } = planner.describe();
  const pivot = cycle.indexOf(22);
  const body = [cycle[(pivot + 1) % 440], 22, cycle[(pivot + 439) % 440]];
  const next = planner.next(body, 0);
  assert.ok(areAdjacent(body[0], next));
  assert.equal(body.includes(next), false);
  assert.equal(planner.describe().switchCount, 0);
  assert.equal(planner.describe().excludedCell, 0);
});

test('invalid targets and unsafe or inconsistent observations are rejected', () => {
  for (const targetScore of [-10, 11, 4380, NaN]) {
    assert.throws(() => createCyclePlanner({ targetScore }), RangeError);
  }
  const planner = createCyclePlanner();
  assert.throws(() => planner.next([...INITIAL_BODY], 220), /Food must occupy an empty cell/);
  assert.throws(() => planner.next([...INITIAL_BODY], 441), RangeError);
  assert.throws(() => planner.next([218, 219, 220], 225), /cycle order/);
  assert.throws(() => planner.next([0, 1, 2], 225), /excluded cell/);
  assert.throws(() => planner.next([105, 106, 127], 225), /insufficient forward space/);
  assert.throws(
    () => createCyclePlanner({ targetScore: 0 }).next([...INITIAL_BODY], INITIAL_FOOD),
    /already been reached/,
  );
});
