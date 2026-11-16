# API and configuration

The browser build exposes `PixelSnakeAutoplay` as a global namespace. Its public entry point creates a controller without starting a round:

```js
const controller = PixelSnakeAutoplay.install({
  targetScore: 3010,
  tickMs: 110,
});
```

Use the browser bundle in the same tab as the compatible game. It is not a Node.js browser driver, browser extension, or remote service.

## Options

| Option        | Type    | Default            | Purpose                                                                                    |
| ------------- | ------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `targetScore` | Integer | `3010`             | Requested score before deliberately ending the round; 0 through 4370, in increments of 10. |
| `tickMs`      | Integer | `110`              | Requested movement interval for this controlled round; 4 through 110 milliseconds.         |
| `selectors`   | Object  | Built-in selectors | Optional overrides for `canvas`, `score`, `replay`, and `dialog`.                          |

Scores follow the game's 10-point increments. A target of 0 starts a round and finishes it without eating. The highest supported target is 4370: a snake of 440 cells. A 4380-point target would fill all 441 cells and enter the game's non-terminating food-spawn loop.

`tickMs` accepts the supported range of 4 through 110 milliseconds. The default preserves normal game timing. A smaller value explicitly enables local acceleration. Timer scheduling is subject to browser load and throttling, so an interval is not a wall-clock completion guarantee.

Options belong to an installation. Create an installation with the intended configuration before starting it; do not mutate the game's internal state to change a running session.

The default selector configuration is:

```js
{
  canvas: '#arcadeCv',
  score: '#arcadeScore',
  replay: '#arcadeAgain',
  dialog: '#arcadeDlg',
}
```

Overriding selectors only redirects element lookup. The board dimensions, colors, visible-dialog convention, replay behavior, timing contract, and game rules must still match.

## Installation ownership

`install()` validates the options and required DOM surface without starting a round. It registers one controller per window for the loaded library. Calling `install()` again throws until the previous controller is destroyed. Destroy the current installation before reloading or replacing the bundle.

The installed controller initially reports `phase: 'idle'`. A missing browser environment, missing controls, incompatible canvas, or invalid option causes installation to throw.

## `controller.start()`

Starts a fresh controlled round through the existing replay button.

Before calling it:

- Open the compatible Snake arcade dialog.
- Keep the tab and game visible.
- Finish or abandon any current round intentionally: replay replaces it.
- Avoid manual steering and other automation during the controlled run.

The adapter checks the game surface, establishes its observation and timing hooks, and starts its model from the game's known initial body. It is not designed to attach to an arbitrary round already in progress.

Each call to `start()` resets the planner and observations and starts another fresh round. It returns the current status snapshot. Calling it after destruction throws.

The game remains responsible for actual movement, growth, random food placement, collisions, and score updates. At the target, the controller chooses inputs that end the round through the normal collision path.

## `controller.status()`

Returns a snapshot of the installation's current progress and lifecycle state. Use it for inspection while the controller is installed:

```js
console.log(controller.status());
```

For a running or finishing controller, this call also checks the dialog visibility and game-over controls before returning. It reconciles a closed or ended round even when the game has already cleared its own timer. There is no separate background monitor: lifecycle changes are detected by a movement callback or a `status()` call.

The snapshot has this shape:

```js
{
  phase: 'idle',
  score: 0,
  targetScore: 3010,
  ticks: 0,
  tickMs: 110,
  reason: null,
}
```

| Field         | Meaning                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `phase`       | `idle`, `running`, `finishing`, `completed`, `stopped`, `error`, or `destroyed`. |
| `score`       | Most recently observed local game score.                                         |
| `targetScore` | Configured target.                                                               |
| `ticks`       | Observed successful head movements; not a wall-clock timer.                      |
| `tickMs`      | Configured controlled interval; remains a configuration value after stopping.    |
| `reason`      | Explanatory string when applicable, otherwise `null`.                            |

`completed` means the local game ended. Check both `score === targetScore` and `reason`: a round can end before its target. `finishing` means the target was observed and the controller is seeking a normal collision. `error` means steering stopped because an assumption or operation failed.

Treat a reported target score and a finished local round separately from remote persistence. Confirm the game-over screen and, where relevant, the refreshed leaderboard in the game's UI. The package does not read private server state or verify a score submission response.

## `controller.stop()`

Ceases automated steering and restores normal timing for the underlying game round.

This operation does not pause the game. The snake can continue moving and naturally collide after control stops. If a normal game-over event then submits a score, that is the existing game's behavior.

Use `stop()` before interacting with the game manually or investigating unexpected behavior.

It returns a status snapshot with `phase: 'stopped'`. Calling it after destruction throws. A stopped controller may be started again, which begins a new round.

## `controller.destroy()`

Stops the controller and releases the installation's owned hooks and controller registration. Use it when you are finished or before replacing an installation as required by the runtime's validation.

It returns a status snapshot with `phase: 'destroyed'`. It does not delete a leaderboard entry, change account settings, close the tab, or undo an earlier game-over event. Refreshing the page also discards the in-memory installation.

The window's global timer function is restored immediately after replay setup. After stop or destruction, the owned round timer keeps the original game callback at normal cadence until the game clears its timer; controller observers and steering are detached.

## Library exports

The package provides these ES module entry points:

| Entry point                       | Exports                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `pixel-snake-autoplay`            | `install`, `createController`, `createCyclePlanner`         |
| `pixel-snake-autoplay/core`       | `createCyclePlanner`                                        |
| `pixel-snake-autoplay/simulation` | `createSnakeGame`, `createSeededRandom`, `simulateToTarget` |

The simulation entry point maps to `src/simulation/index.js`. It is for local, deterministic model runs and is not bundled into the browser controller. The library exports are useful for tests and integrations that supply their own environment or game model:

```js
import { createCyclePlanner } from './src/index.js';

const planner = createCyclePlanner({ targetScore: 3010 });
const nextCell = planner.next([220, 219, 218], 225);
```

`createCyclePlanner()` exposes `next(body, food)`, `reset()`, and `describe()`. Body cells are ordered head to tail and encoded as `y * 21 + x`. `next()` returns a legal neighboring cell under the planner's invariants; it does not modify the supplied game. Stop requesting moves once the target is reached. `reset()` is for a new compatible round, not an arbitrary live body.

`createController(options, { window, document })` accepts explicit browser dependencies for testing and integration. It does not use `install()`'s per-window registration, so integrations using it must manage ownership themselves. Use `install()` for ordinary console operation.

For a complete local simulation from a checkout:

```js
import { simulateToTarget } from 'pixel-snake-autoplay/simulation';

const result = simulateToTarget({ seed: 1, targetScore: 3010 });
console.log(result.outcome, result.score, result.steps);
```

`simulateToTarget()` also accepts `maxSteps`, defaulting to 1,000,000. Its outcome distinguishes `target-reached`, `step-limit`, `collision`, and `filled`. The lower-level `createSnakeGame()` returns `getState()` and `step(nextCell)` for direct model integration; `createSeededRandom()` exposes the deterministic random generator used by that model.

## Errors and unexpected state

Do not repeatedly restart a failing controller against an unverified game version. Read the error, inspect `status()`, and compare the page against the [compatibility contract](ARCHITECTURE.md#browser-compatibility-contract).

An error can indicate an unsupported page, unexpected pixels or body length, a missed movement step, an incompatible timer, or interference with the controller's assumptions. Resolve that cause before starting another round.

## Privacy boundaries

The package needs the arcade canvas, score label, replay control, and relevant game timing callback. It does not need a user name, room identifier, password, cookie, token, browser history, or access to local files.

No configuration option accepts credentials or a server destination. The package contains no direct network transport or persistent browser storage for gameplay. The host game retains its own network behavior.
