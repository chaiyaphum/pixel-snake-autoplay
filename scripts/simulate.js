import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TARGET_SCORE, MAX_SAFE_SCORE } from '../src/core/grid.js';
import { simulateToTarget } from '../src/simulation/simulate.js';

/** @param {string[]} args */
export function parseArguments(args) {
  const options = { seed: 1, runs: 10, targetScore: DEFAULT_TARGET_SCORE, help: false };
  const keys = { '--seed': 'seed', '--runs': 'runs', '--target': 'targetScore' };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    const key = keys[argument];
    const value = args[++index];
    if (!key) throw new Error(`Unknown option: ${argument}`);
    if (value === undefined || !/^\d+$/.test(value))
      throw new Error(`${argument} requires a non-negative integer.`);
    options[key] = Number(value);
  }
  if (!Number.isSafeInteger(options.seed) || options.seed > 0xffff_ffff)
    throw new Error('--seed must be an integer from 0 through 4294967295.');
  if (!Number.isSafeInteger(options.runs) || options.runs < 1 || options.runs > 1000)
    throw new Error('--runs must be an integer from 1 through 1000.');
  if (options.targetScore > MAX_SAFE_SCORE || options.targetScore % 10 !== 0)
    throw new Error(`--target must be a multiple of 10 from 0 through ${MAX_SAFE_SCORE}.`);
  return options;
}

/** @param {string[]} [args] */
export function runSimulations(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    console.log('Usage: npm run simulate -- [--seed 1] [--runs 10] [--target 3010]');
    console.log('Runs deterministic local simulations. No browser or network access is used.');
    return { successful: true, results: [] };
  }
  const results = [];
  for (let run = 0; run < options.runs; run++) {
    const seed = (options.seed + run) >>> 0;
    const result = simulateToTarget({ seed, targetScore: options.targetScore });
    results.push(result);
    console.log(
      `seed=${seed} score=${result.score} steps=${result.steps} outcome=${result.outcome}`,
    );
  }
  const reached = results.filter((result) => result.outcome === 'target-reached').length;
  console.log(`Reached target: ${reached}/${results.length}.`);
  return { successful: reached === results.length, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!runSimulations().successful) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
