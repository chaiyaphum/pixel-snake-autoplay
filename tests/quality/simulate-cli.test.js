import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseArguments } from '../../scripts/simulate.js';

test('uses deterministic defaults and parses the documented CLI options', () => {
  assert.deepEqual(parseArguments([]), { seed: 1, runs: 10, targetScore: 3010, help: false });
  assert.deepEqual(parseArguments(['--seed', '42', '--runs', '2', '--target', '100']), {
    seed: 42,
    runs: 2,
    targetScore: 100,
    help: false,
  });
});

test('rejects unknown, malformed, excessive, and unsupported CLI inputs', () => {
  for (const args of [
    ['--unknown', '3'],
    ['--runs'],
    ['--runs', '0'],
    ['--runs', '1001'],
    ['--seed', '-1'],
    ['--seed', '4294967296'],
    ['--target', '10.5'],
    ['--target', '11'],
    ['--target', '4380'],
  ])
    assert.throws(() => parseArguments(args), Error, args.join(' '));
});

test('runs deterministic local games from the CLI and returns an appropriate exit code', () => {
  const script = fileURLToPath(new URL('../../scripts/simulate.js', import.meta.url));
  const result = spawnSync(
    process.execPath,
    [script, '--seed', '12', '--runs', '2', '--target', '50'],
    {
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /seed=12 score=50/);
  assert.match(result.stdout, /seed=13 score=50/);
  assert.match(result.stdout, /Reached target: 2\/2/);
  const invalid = spawnSync(process.execPath, [script, '--target', '4380'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /multiple of 10/);
});
