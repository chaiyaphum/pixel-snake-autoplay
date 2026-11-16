# Release verification

Verification date: 2026-11-16. Package version: 1.0.0.

## Local results

The release candidate passed `npm run check` on Node.js 22.14.0:

| Check                     | Result                                                      |
| ------------------------- | ----------------------------------------------------------- |
| ESLint                    | Passed                                                      |
| Prettier                  | Passed                                                      |
| Full automated test suite | 50 passed, zero failed                                      |
| Instrumented test suite   | 49 passed; the already-run 100-seed stress case is excluded |
| Source line coverage      | 98.34%                                                      |
| Source branch coverage    | 96.97%                                                      |
| Source function coverage  | 100%                                                        |
| Browser bundle            | Built successfully; loading it has no browser side effects  |
| Repository privacy check  | Passed                                                      |

The deterministic stress test reached 3010 in all 100 seeds, using 24,503 to
31,199 movements per run and 119 excluded-cell exchanges in total. The maximum
safe target test reached 4370 with 440 occupied cells, before impossible
full-board food placement. Finishing-route tests cover targets 0, 10, 3010, and
4370 and verify that finishing does not eat additional food or reverse into the
neck.

The browser-controller integration fixture uses a separate in-memory game,
canvas samples, keyboard events, and fake timers. It completed an entire round
at exactly 3010 through the game's normal movement and collision contract.
Lifecycle regressions cover repeated destruction, installation ownership,
normal-cadence restoration, and a dialog whose owner already cleared its timer.

## Privacy and dependencies

Gitleaks 8.30.1 scanned the publication snapshot with redacted output and reported
no leaks. The focused repository checker additionally flags recognizable private
room links, personal filesystem paths, and credentials, and rejects screenshots,
downloaded site bundles, and other private artifacts. The generated JavaScript bundle is
also checked before writing it.

The npm registry audit returned zero reported vulnerabilities across the locked
dependency tree. The package has no runtime dependencies. These checks establish
the result of the tools at the verification date; they are not a guarantee that
every possible secret or future vulnerability has been identified.

## Reproduction and CI

```sh
npm ci
npm run check
npm run simulate -- --seed 1001 --runs 10 --target 3010
```

The [CI workflow](../.github/workflows/ci.yml) runs the checks on Node.js 22 and 24.
Use the [GitHub Actions history](https://github.com/chaiyaphum/pixel-snake-autoplay/actions)
to inspect the result for a specific pushed commit. Each build writes the bundle
and its matching SHA-256 sidecar to `dist/`.

## Evidence boundary

This release verification covers source checks, deterministic simulations, the
in-memory browser integration, artifact generation, and privacy checks. It does
not certify a particular live game's current version, remote score acceptance,
or leaderboard persistence. No live game was restarted to validate this
refactored release after the user stopped the browser task.
