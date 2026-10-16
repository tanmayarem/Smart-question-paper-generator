# Architecture

## Overview

```
Browser (Vite, src/main.js)
    │  fetch /api/*
    ▼
Express (server/createApp.js)
    │  imports
    ▼
Pure engine (src/engine.js)     Question bank (src/questions.json)
```

The UI never imports the engine. The API and Vitest engine tests share the same module so selection rules stay in one place. Generated papers remain in the browser session; there is no persistence layer.

The optional question workflow drafts candidates through the OpenAI API into ignored `data/pending.json`. `scripts/approve.js` handles human review, and runs `scripts/validate-bank.js` on the full proposed bank before appending an approved question.

## Engine

- `validateConfig` — totals 5–60, mixes sum to 100% per dimension
- `analyzeFeasibility` — category and pair mark budgets vs bank
- `generatePaper(bank, config, { seed })` — seeded greedy + local swap search (250 ms cap)
- `swapQuestion` — tiered replacement: full metadata → same type → same marks only
- `paperStatusLabel` — Exact match / Total met, mix approximate / Total not reachable

## Frontend

- Settings panel → POST `/api/generate`
- Exam sheet: header, Sections A/B/C, easy→hard within section, continuous numbering
- Answer key in a separate block (print: page break)
- Swap → POST `/api/swap` with current paper snapshot

## Local dev

`npm run dev` runs the API on port **3001** and Vite on **5173** with a proxy for `/api`.

## Production

`npm run build` then `npm start` serves `dist/` from Express when `dist/` exists. On Vercel, static files come from the build output; `/api/*` is handled by `api/index.js` exporting the same Express app.
