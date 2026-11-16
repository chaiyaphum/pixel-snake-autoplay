# Architecture and algorithm

Pixel Snake Autoplay separates route planning from browser integration. The planner reasons about numbered cells and body order. The browser adapter obtains observations and supplies normal keyboard input to the existing game.

```text
Game canvas and score label
          |
          v
Board observation and body reconstruction
          |
          v
Cycle planner and target policy
          |
          v
Arrow-key event -> game's movement callback
          |
          v
Game renders the next state
```

The game owns its state throughout this loop. Local acceleration, when requested, changes the callback schedule rather than replacing the movement or scoring implementation.

## Browser compatibility contract

The adapter targets these observed characteristics:

| Surface                  | Expected behavior                                                         |
| ------------------------ | ------------------------------------------------------------------------- |
| `#arcadeCv`              | A 420 × 420 canvas for a 21 × 21 board.                                   |
| `#arcadeScore`           | Current score as numeric text.                                            |
| `#arcadeAgain`           | Replay control; hidden during a live round and available after game over. |
| `#arcadeDlg`             | Arcade dialog; the `show` class indicates that it is open.                |
| Grid cells               | 20 × 20 pixels; sample each cell's center.                                |
| Head                     | RGB `(187, 247, 208)`, hex `#bbf7d0`.                                     |
| Body                     | RGB `(74, 222, 128)`, hex `#4ade80`.                                      |
| Food                     | RGB `(248, 113, 113)`, hex `#f87171`.                                     |
| Keyboard input           | Arrow codes on ordinary `keydown` events.                                 |
| Initial body             | Head first: `(10,10)`, `(9,10)`, `(8,10)`.                                |
| Initial direction        | Right.                                                                    |
| Initial food             | `(15,10)`.                                                                |
| Normal movement interval | 110 milliseconds.                                                         |
| Growth and score         | One cell and 10 points per food.                                          |

Cells are represented as `y * 21 + x`. Coordinates start at the upper-left corner.

Wall collision ends the round. Body collision examines the whole current body, including its current tail, before removing a tail cell. A planner that assumes the head may move into the tail's current location is therefore incompatible with this game.

These values form an explicit compatibility boundary, not a universal Snake implementation. A page update can invalidate the adapter even if the game still looks similar.

## Observation and timing

The adapter reads canvas pixels and the score label to identify the head, body cells, and food. It reconstructs body order from the known starting body and successive head movements. Score growth determines whether to retain the previous tail.

Observation must stay synchronized with game steps. A missed step cannot safely be reconstructed by assuming that the head moved once. The implementation validates its assumptions and reports incompatible observations instead of silently treating a different board as supported.

The clock temporarily intercepts timer creation only while replay runs synchronously. It captures the new round's 110 ms interval, retains the timer identity expected by the game, and restores the window's global `setInterval` immediately in a `finally` block. Observations and inputs run immediately before the original movement callback.

When acceleration is requested, that captured round callback is scheduled at the configured interval. Stop, destruction, detection of a closed dialog, or a controller error detaches observation and steering and returns the callback to normal cadence. The released timer wrapper remains only to run the game's callback until the game clears its own timer; no global timer patch remains installed.

Visibility and game-over checks run during movement callbacks and when `status()` is called for a running or finishing controller. There is no independent background monitor. If closing the dialog also clears the game's timer, the next `status()` call reconciles the lifecycle state.

## Two cycles cover an odd-sized board

A 21 × 21 grid has 441 cells. Its checkerboard coloring has unequal counts, so it cannot have a Hamiltonian cycle through every cell using only orthogonal moves.

The planner constructs a cycle through 440 cells, leaving `(0,0)` outside the route. Near the upper-left corner, the route includes:

```text
(1,0) -> (1,1) -> (0,1)
```

An alternative route replaces the middle cell:

```text
(1,0) -> (0,0) -> (0,1)
```

The second version excludes `(1,1)` instead. The other 439 route positions keep their order. When food occupies the excluded cell, the planner can exchange these two middle cells as soon as the old middle cell is unoccupied. Every occupied body cell retains its cycle index, preserving the order invariant.

## Safe shortcuts

Following a cycle one cell at a time avoids crossing an ordered body, but it can take a long time. A shortcut is an orthogonally adjacent move that advances more than one position along the cycle.

The planner accepts a shortcut only when it:

1. Moves to a supported, unoccupied neighboring cell.
2. Advances along the cycle without passing the tail.
3. Does not pass the current food along the selected route.
4. Leaves enough forward space for the remaining growth to the requested target.

The relevant gap is the forward cycle distance from the next head to the next tail. If the move eats, the tail stays in place. Otherwise, the next tail is the current body's penultimate cell.

Let `remainingGrowth` be the number of additional food items required after the proposed move. For targets below 4370, the target-aware rule reserves at least:

```text
remainingGrowth + 2
```

cycle steps from head to tail. The extra space matters because the game forbids entering the current tail.

For the maximum 4370-point target, the terminal gap is one rather than two. The final food occupies the last available position on the 440-cell cycle, after which normal planned movement must stop immediately and the controller must finish through collision.

## Why the reserve is sufficient

Initially, the three-cell body is ordered along the cycle and has ample forward space. A normal non-growing cycle move advances the head by one position and the tail by at least one, so it does not reduce the available gap. A growing move keeps the tail fixed and reduces both the gap and remaining growth by one.

Each accepted shortcut explicitly restores the required bound for its resulting state. Swapping the excluded cell does not change any occupied body's position in the cycle order. By induction, the planner retains a free legal successor until the target is reached, provided the observations and game rules remain valid.

This is a property of the planner under its model. Browser integration must still deliver the intended key before the corresponding movement callback. Tests of the planner alone cannot prove that delivery happened in a particular browser session.

## Finishing and maximum supported target

At the target, the controller uses the normal movement interface to cause a collision. It must not continue eating beyond the requested target while seeking a legal direction that ends the round.

The game's food generator repeatedly chooses an unoccupied cell. At 441 occupied cells, that loop has no valid result and does not terminate. With a starting length of three, the last supported target is therefore:

```text
(440 - 3) * 10 = 4370
```

The package deliberately avoids the 4380-point full-board state.

## Boundaries of the model

The planner does not account for obstacles, wraparound, moving food, multiple foods, variable growth, arbitrary starting bodies, changed colors, or modified scoring. Manual steering can break body ordering. Background throttling and competing scripts can break timing assumptions.

The controller does not establish permission to automate a game or use acceleration. The host game's policies and the expectations of other players remain relevant when results are shared.
