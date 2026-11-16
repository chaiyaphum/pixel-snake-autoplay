# Pixel Snake Autoplay

A reusable browser controller for a specific 21 × 21 Snake arcade game. It reads the board from canvas pixels, plans a safe route, and sends ordinary arrow-key events. It does not assign a score, choose food positions, or replace the game's collision rules.

The project is an independent tool. It includes no game source, third-party artwork, account data, saved browser sessions, or room links.

## How it works

The controller follows a Hamiltonian cycle: a closed route that visits 440 of the board's 441 cells. Two interchangeable versions of the route let it reach food in the otherwise excluded cell. It can take shortcuts while preserving the order of the snake's body and reserving enough free route for the remaining target score.

The browser adapter recognizes the head, body, and food by their canvas colors. Movement still passes through the game's keyboard handler, movement callback, food generation, collision detection, and scoring logic. At the requested score, the controller steers into a normal collision so the game can finish the round.

**The default movement interval is the game's normal 110 ms.** An optional interval from 4 to 110 ms accelerates this round locally. Acceleration changes the time between game steps; it is not ordinary-speed play, and it may be inappropriate for a shared leaderboard. Use it only where you have permission.

## Quick start

You need Node.js 22.13 or later to build the project and a desktop browser with access to the compatible game. The generated bundle has no runtime dependencies.

Clone the private repository using an account with access, then build it:

```sh
git clone https://github.com/chaiyaphum/pixel-snake-autoplay.git
cd pixel-snake-autoplay
npm ci
npm run check
```

The build creates `dist/pixel-snake-autoplay.js`. Review the source and generated bundle before running it in a signed-in page.

1. Open the game's Snake arcade dialog yourself. Keep the game visible in the foreground.
2. Open the browser's developer console in that game tab.
3. Paste the reviewed contents of `dist/pixel-snake-autoplay.js` and run them.
4. Create a controller, then explicitly start a new round:

```js
const controller = PixelSnakeAutoplay.install({
  targetScore: 3010,
  tickMs: 110,
});

controller.start();
```

Loading the bundle and calling `install()` do not start a game. `start()` requires the visible arcade dialog and clicks its replay button, replacing the current round.

If the browser blocks console pasting, review the code and follow the browser's own instructions yourself. This project does not bypass that protection. Do not paste code whose origin or behavior you have not checked.

## Control an installed session

```js
controller.status(); // Inspect progress and lifecycle state.
controller.stop(); // Stop controlling; return the game clock to normal speed.
controller.destroy(); // Stop controlling and release this installation's hooks.
```

`stop()` does not pause or end the underlying round. The game continues at its normal speed and may subsequently collide. `destroy()` also releases the installed controller and its owned resources. Neither operation reverses a score the game has already submitted.

To opt into a faster local run:

```js
const controller = PixelSnakeAutoplay.install({
  targetScore: 3010,
  tickMs: 4,
});
```

This example only installs the controller. Call `controller.start()` when you are ready to begin.

## Configuration

| Option        | Default                   | Meaning                                                                             |
| ------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| `targetScore` | `3010`                    | Integer from 0 through 4370 in increments of 10; finish through a normal collision. |
| `tickMs`      | `110`                     | Integer from 4 through 110; local interval between movement steps.                  |
| `selectors`   | Built-in arcade selectors | Optional overrides for compatible DOM controls; does not change game rules.         |

The supported game awards 10 points per food and starts with a three-cell snake. Its food-spawn loop does not terminate when the board becomes completely full. The controller therefore does not attempt a 4380-point, 441-cell round. See [API and configuration](docs/API.md) for validation and lifecycle details.

## Compatibility and limits

The adapter is deliberately specific to one game layout and rule set:

- A 420 × 420 canvas containing 21 × 21 cells of 20 pixels each.
- Fixed head, body, and food colors and the arcade DOM controls described in the [compatibility contract](docs/ARCHITECTURE.md#browser-compatibility-contract).
- Wall collisions, no wraparound, 10 points per food, and collision with the current tail before that tail moves.
- A new round starting with the known three-cell body and direction.

The route proof applies to those rules and a correctly observed sequence of game steps. It does not guarantee compatibility with a changed game, missed frames, browser throttling, manual steering, or competing scripts. Keep the tab visible, avoid using movement keys while the controller runs, and stop if the board or controls differ.

A browser controller cannot guarantee that a remote leaderboard accepts a result. This package makes no direct score request. The game itself may submit a score when its normal game-over logic runs.

## Development

```sh
npm test
npm run coverage
npm run simulate
npm run lint
npm run format:check
npm run check:secrets
npm run build
npm run check
```

Tests use Node's built-in test runner. ESLint, Prettier, and esbuild are development dependencies. GitHub Actions runs `npm ci`, `npm run check`, and seeded simulations on Node.js 22 and 24.

The package is marked private to prevent accidental npm publication. Repository access and visibility are managed separately by the Git hosting service.

See [development and verification](docs/DEVELOPMENT.md) for what each check establishes and what still requires an actual browser. Do not interpret simulation success as proof of a saved leaderboard result.

## Documentation

| Document                                            | Contents                                                        |
| --------------------------------------------------- | --------------------------------------------------------------- |
| [API and configuration](docs/API.md)                | Installation, lifecycle, options, and cleanup semantics.        |
| [Architecture and algorithm](docs/ARCHITECTURE.md)  | Board observations, cycle construction, invariants, and limits. |
| [Operation and troubleshooting](docs/OPERATIONS.md) | Running the bundle, stopping safely, and diagnosing failures.   |
| [Development and verification](docs/DEVELOPMENT.md) | Local checks, simulations, releases, and evidence boundaries.   |
| [Release verification](docs/VERIFICATION.md)        | Measured test, coverage, dependency, and privacy results.       |
| [Contributing](CONTRIBUTING.md)                     | Change scope, review expectations, and contribution workflow.   |
| [Security](SECURITY.md)                             | Trust model, privacy boundaries, and private reporting.         |
| [Changelog](CHANGELOG.md)                           | Changes to the reusable package.                                |

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE). This license covers this repository's original code and documentation; it grants no rights to the game or its assets.
