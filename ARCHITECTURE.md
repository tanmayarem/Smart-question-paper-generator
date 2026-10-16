# Architecture notes

- `index.html`: responsive UI and print stylesheet.
- `app.js`: mix validation, bounded paper search, score calculation, breakdown, swap and answer toggling.
- `src/questions.json`: tagged local question bank.

The browser loads `src/questions.json` with `fetch`, so use a static host or a local HTTP server; opening the HTML via `file://` may block the fetch in some browsers.
