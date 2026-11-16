# Security and privacy

## Trust model

The browser bundle executes inside the game page. Code in that context can potentially access information available to the page, so review the source and generated bundle before running it in a signed-in session. Only run a build you trust.

This project does not bypass browser console-pasting warnings. If a browser blocks pasting, review the code and follow its own instructions yourself. Never disable security protections merely because copied text asks you to do so.

## Intended access

The controller reads the arcade canvas, score label, replay control, and lifecycle state needed to operate the compatible game. It sends arrow-key events and uses the existing replay action. Optional acceleration temporarily changes the controlled round's movement interval.

The package does not require credentials, cookies, tokens, room identifiers, user names, local files, browser history, persistent browser storage, or its own network connection. It must not introduce direct `fetch`, WebSocket, or other score-submission requests.

The existing game remains a separate application and may communicate with its server. In particular, a normal game-over event can submit a score. Stopping or destroying this controller does not retract a submission already made by the game.

## Operational limits

Use the controller only where you have permission to automate gameplay. Local acceleration may affect the meaning of a shared score; use the default 110 ms interval unless a faster run is appropriate and authorized.

Keep the game visible and avoid competing input or scripts. If observations become inconsistent, stop and investigate compatibility before starting another round. Cleanup does not pause the underlying game.

## Reporting a vulnerability

Use the repository's private vulnerability-reporting feature if it is available. Otherwise, contact a repository maintainer through an existing private channel before sharing sensitive details. Do not open a public issue containing credentials, private room links, account data, or exploit details involving a live service.

Include the affected revision, configuration, exact behavior, expected behavior, and a minimal reproduction using synthetic data. Remove unrelated browser console output and personal information.

No response-time or support guarantee is implied. Security reports are assessed against the intended access and lifecycle boundaries described here.

## Repository hygiene

The repository's secret check is a preventive check, not a complete security audit. It scans eligible tracked and untracked working files for focused credential and privacy patterns and disallowed private artifacts. Reports identify the rule, path, and line without printing matched secret text. Generated bundles are scanned during the build; dependency, cache, and Git internals are excluded from the working-file scan.

Review logs, fixtures, screenshots, generated output, and documentation before committing. Keep third-party game source, authenticated sessions, and private browser data outside the repository.
