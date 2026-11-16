# Operation and troubleshooting

## Prepare a session

Build from a trusted checkout, run the project's checks, and inspect the source and bundle before executing them inside a signed-in page. Open the compatible Snake arcade dialog yourself. The package does not navigate to a room, sign in, request account permissions, or open the arcade for you.

Keep the game tab visible. Starting a controller begins a new round by clicking the existing replay control. It replaces an in-progress round, so call `start()` only when that is intentional.

Use the normal 110 ms interval unless you intentionally choose local acceleration and have permission to use it in that setting.

## Load and start

Paste the reviewed browser bundle into the developer console, then run:

```js
const controller = PixelSnakeAutoplay.install({ targetScore: 3010, tickMs: 110 });
controller.start();
```

The console-pasting warning in some browsers is a protection against untrusted instructions. Review the code and follow the browser's own instructions yourself if you choose to proceed. Do not disable browser protections or install an unrelated extension to make this package run.

Loading or installing the package alone does not start a round. If an installation fails, address the reported cause before trying again.

## Observe progress

```js
controller.status();
```

Confirm that the visible board moves as expected and that its score matches the status snapshot. Avoid movement keys, replay clicks, closing the arcade, or another script that changes the same controls while the controller runs.

A lower `tickMs` shortens the requested interval; it does not promise an exact completion time. Browser load, rendering, and scheduling affect actual speed. The game remains responsible for food placement, so the number of movement steps also varies between rounds.

## Stop and clean up

```js
controller.stop();
```

Automated steering stops and the round returns to normal timing. The underlying game continues. It may reach a normal collision and submit a score after control has stopped.

When finished:

```js
controller.destroy();
```

Destroying releases the installation's hooks and controller registration. Reloading the tab discards the page's in-memory script state. Neither action retracts a score already accepted by the game's server.

## Verify a result

Keep these observations separate:

| Observation                            | What it establishes                                          |
| -------------------------------------- | ------------------------------------------------------------ |
| `status()` reports a score             | The controller observed that local score.                    |
| Game-over screen shows the target      | The game's local round ended at that score.                  |
| Refreshed leaderboard shows the result | The game's UI reports a stored or served leaderboard result. |
| Repository checks pass                 | The checked source and test cases passed locally or in CI.   |

Do not claim that a local score was saved remotely without checking the game UI. This package does not query private endpoints or send its own leaderboard request.

## Troubleshooting

| Symptom                                          | What to check                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PixelSnakeAutoplay` is undefined                | Confirm that the complete built bundle ran in the game tab's console.                                                               |
| Installation succeeds but nothing moves          | Installation is inert; call `start()` when ready.                                                                                   |
| Start rejects the page                           | Open the arcade dialog and compare its canvas and controls against the compatibility contract.                                      |
| Pixel, body-length, or movement validation fails | Stop. Check for changed game rendering, a missed step, manual steering, or competing automation.                                    |
| The run slows in a background tab                | Return the tab to the foreground. Browser scheduling can throttle hidden pages.                                                     |
| The score keeps changing after `stop()`          | Stopping control does not pause the game; the round continues at normal timing.                                                     |
| A finished round is absent from the leaderboard  | Confirm the game is connected and refresh its leaderboard through the normal UI. Local completion does not prove remote acceptance. |
| An option is rejected                            | Use supported numeric values and the documented score increments. Do not edit game variables to work around validation.             |
| The game page has changed                        | Update the compatibility adapter and its tests before resuming automation.                                                          |

If a problem persists, record the package revision, browser version, options, lifecycle state, and exact error message. Remove room links, player names, cookies, tokens, unrelated console output, and private screenshots before sharing a report.
