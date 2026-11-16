# Contributing

Keep changes focused on a reusable, inspectable Snake controller. The package must preserve the game's ownership of movement, food placement, collisions, and scoring. Do not add direct score submission, score assignment, credential collection, hidden network traffic, or automatic bypasses of browser protections.

## Before changing behavior

Read the [architecture](docs/ARCHITECTURE.md) and [API](docs/API.md). The planner's proof depends on the exact board and collision rules, including the rule that the current tail is occupied during collision detection.

If the game changes, update the compatibility contract, adapter, and relevant tests together. Do not broaden support based only on similar visual appearance.

## Local workflow

```sh
npm ci
npm run check
```

Implement the smallest complete change, add meaningful tests for changed behavior, update the relevant documentation, and rerun checks. Regenerate the browser bundle through the build command rather than editing it manually.

## Review expectations

A change description should explain the concrete problem, resulting behavior, validation performed, and remaining limits. For timing or lifecycle changes, describe how the game's clock and owned hooks are restored. For route changes, explain how body order and the forward-space reserve remain valid.

Report simulation results separately from browser checks and remote leaderboard observations. Include reproducible seeds for planner failures.

## Privacy and licensing

Use synthetic test fixtures. Do not commit credentials, cookies, tokens, room links, player names, private screenshots, browser profiles, or machine-specific paths.

Do not copy the game's bundled application or artwork into this repository. Contributions must be compatible with the repository's MIT license. See [NOTICE](NOTICE) for the distinction between this package and the third-party game.

Report security-sensitive issues privately as described in [SECURITY.md](SECURITY.md).
