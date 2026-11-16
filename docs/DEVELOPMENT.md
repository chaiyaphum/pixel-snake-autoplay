# Development and verification

## Toolchain

Use Node.js 22.13 or later and install the locked development dependencies:

```sh
npm ci
```

The runtime is dependency-free JavaScript. Node's built-in test runner handles automated tests; ESLint, Prettier, and esbuild support source checks and the browser build.

## Commands

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `npm test`              | Run automated tests.                                   |
| `npm run coverage`      | Run tests with coverage reporting.                     |
| `npm run simulate`      | Exercise planner runs against the modeled game rules.  |
| `npm run lint`          | Check JavaScript conventions and likely mistakes.      |
| `npm run format:check`  | Verify formatting without rewriting files.             |
| `npm run check:secrets` | Scan the repository for disallowed sensitive material. |
| `npm run build`         | Produce the standalone browser bundle.                 |
| `npm run check`         | Run the repository's aggregate verification workflow.  |

The exact commands and dependency versions are defined in `package.json` and the lockfile. GitHub Actions installs with `npm ci`, runs `npm run check`, and executes seeded simulations on Node.js 22 and 24.

`npm run check` runs lint, formatting checks, the full test suite, coverage, the build, and the privacy scan in that order. The full suite includes the 100-seed stress test. The coverage pass skips only that already-run test (`one hundred deterministic seeds`) to avoid redundant instrumentation; every other behavioral test runs with coverage enabled. Coverage thresholds are enforced at 95% of lines, 90% of branches, and 95% of functions.

## Source layout

| Path              | Responsibility                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `src/core/`       | Grid validation, cycle construction, body ordering, and route decisions.                       |
| `src/browser/`    | Canvas observations, keyboard input, round timing, finishing policy, and controller lifecycle. |
| `src/simulation/` | Independent deterministic game transitions and simulation orchestration.                       |
| `src/index.js`    | Public library exports.                                                                        |
| `scripts/`        | Build, simulation, and repository checks.                                                      |
| `tests/`          | Automated behavioral and invariant checks.                                                     |
| `dist/`           | Generated standalone browser artifact.                                                         |
| `docs/`           | API, algorithm, operation, and verification guidance.                                          |

## Test meaningful contracts

Planner tests should validate the behavior needed by the real game:

- Cycle length, uniqueness, orthogonal adjacency, and compatibility with the initial body.
- The excluded-cell swap and preservation of occupied body ordering.
- Collision checks that include the current tail.
- Safe shortcuts and the target-aware forward-space reserve.
- Score increments, target validation, and avoidance of the full-board spawn loop.
- Reproducible seeded simulations across complete rounds.

Adapter tests should exercise observations and lifecycle boundaries:

- Compatible and incompatible canvas/control surfaces.
- Pixel recognition, ordered-body reconstruction, and missed-frame detection.
- Inert installation followed by explicit start through replay.
- Synchronization of observations, inputs, and movement callbacks.
- Normal timing by default and deliberate acceleration when configured.
- Cleanup and normal-clock restoration after stop, destruction, and errors.
- Target completion through the game's collision path.

Prefer assertions about externally visible behavior and invariants over tests that repeat an implementation line for line.

## Simulation is a model check

Seeded simulations make route failures reproducible and allow comparison of movement counts. Preserve the seed and configuration when reporting a failure. Use the exact wall, body, tail, growth, and score rules from the compatibility contract.

```sh
npm run simulate -- --seed 1 --runs 10 --target 3010
npm run simulate -- --help
```

| Flag       | Default | Accepted values                                          |
| ---------- | ------- | -------------------------------------------------------- |
| `--seed`   | `1`     | An unsigned 32-bit integer, from 0 through 4294967295.   |
| `--runs`   | `10`    | Number of consecutive seeds to run, from 1 through 1000. |
| `--target` | `3010`  | A multiple of 10 from 0 through 4370.                    |

Each result reports the seed, score, number of attempted steps, and outcome. The command exits unsuccessfully if a requested run does not reach its target. It does not wait for real-time browser intervals.

A simulation does not open a browser, validate a live canvas, establish authorization to automate a leaderboard, or prove remote score persistence. Browser integration and live result verification are separate checks.

The independent simulation model ends with a `filled` state if every board cell is occupied. This is an intentional difference from the compatible game's endless full-board food-spawn loop, allowing the model to test that boundary without hanging. Simulations do not reproduce browser keyboard filtering, canvas rendering, timers, or server behavior.

## Build artifact

`npm run build` produces `dist/pixel-snake-autoplay.js`, a standalone IIFE exposing the browser global `PixelSnakeAutoplay`.

The build also writes `dist/pixel-snake-autoplay.js.sha256` with the artifact's SHA-256 digest. Use that identity when recording which bundle was reviewed or tested. The artifact is intentionally not minified and includes no source map containing local paths.

Review both the source changes and the generated artifact before use. The bundle should contain only this package's implementation and the build wrapper: no copied game application, credentials, room links, screenshots, account state, or third-party assets.

Do not hand-edit the built output. Change source, rerun checks, and regenerate the bundle.

## Manual browser verification

Use a compatible game session where you have permission to run the tool. Keep the default normal interval for a standard timing check; document acceleration separately when used.

Verify that installation alone does not start a game, explicit start begins a new round, the board and observed score remain consistent, the target ends through a normal collision, and cleanup restores the expected clock. Also test the intended response to an incompatible page and an interrupted run.

Record the browser version, source commit, bundle identity, options, observed result, and any limitation. Do not commit private room identifiers, user names, screenshots of other players, or authenticated page data.

## Release evidence

For a release, distinguish these claims:

| Claim                            | Evidence to retain                                               |
| -------------------------------- | ---------------------------------------------------------------- |
| Source checks passed             | Command, source revision, and successful output.                 |
| Simulations passed               | Seeds, options, rule model, and results.                         |
| Bundle was built                 | Build command and artifact identity.                             |
| Browser integration worked       | Browser/version, configuration, and observed lifecycle behavior. |
| A score was accepted remotely    | A separate observation from the game's normal UI.                |
| Repository publication succeeded | Remote revision and repository visibility.                       |

Do not describe planned checks as completed. A release verification record should state which checks actually ran and which remain unverified.

## Secret and privacy review

Automated scanning supplements review; it cannot prove the absence of all sensitive data. Review new text, fixtures, artifacts, and logs for credentials, account identifiers, room links, player data, and machine-specific paths before committing.

Synthetic fixtures should be sufficient for tests. Keep any live observation outside the repository unless it has been deliberately sanitized and is necessary to reproduce a compatibility issue.
