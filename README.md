# PaperPilot

I built PaperPilot to make printable Science exams from a curated question bank. I use rules, not AI, to select questions so marks and constraints stay visible and testable.

## Approach and why

The engine builds a paper with a seeded search, then tries same-mark swaps to improve its difficulty, topic, and question-type mix. I keep AI out of question selection: generated text can contain incorrect answers or syllabus errors. AI could help draft questions later, but a teacher should review them before they enter the bank.

## How constraints that don’t fit are handled

Each mix must total 100%; invalid settings receive an HTTP 400 error. The engine compares requested mark budgets with the bank and shows conflicts instead of silently changing the paper. For example, requesting 40 marks of Hard Biology gives the real conflict: `Hard Biology: requested 40 marks, only 26 available`. The status distinguishes **Exact match**, **Total met, mix approximate**, and **Total not reachable**.

## Where it falls short and next steps

The bank needs review against a specific syllabus. Selection is a fast heuristic, not a guaranteed optimum. Next I would add teacher-approved questions and stronger persistent storage for deployed use.

## One thing I’m proud of / one thing still weak

**Proud of:** _(I’ll fill this in.)_

**Still weak:** _(I’ll fill this in.)_

## How to run and test

```bash
npm install
npm run dev
npm run build
npm test
npm run validate:bank
```

Open http://localhost:5173. For a production server, run `npm start` after building.

## Tech stack

I use Vite, plain JavaScript and CSS, Node, Express, Vitest, Supertest, and a JSON file store (`data/papers.json`). Vercel builds the Vite app and routes API requests to the shared Express app.

## Architecture

The browser in `src/main.js` calls `/api/*`; it does not import the engine. `server/createApp.js` owns the HTTP routes and loads `src/questions.json`. Both the API and tests use the single selection engine in `src/engine.js`. `server/store.js` saves and loads papers as JSON.

| Method | Path | Request | Result |
|---|---|---|---|
| GET | `/api/questions` | — | Question bank |
| POST | `/api/generate` | `{ config, seed? }` | Paper, status, conflicts, deviations |
| POST | `/api/swap` | `{ paper, questionId, config }` | Replacement, level used, or reason |
| POST | `/api/papers` | `{ config, paper, seed?, title? }` | Saved paper and ID |
| GET | `/api/papers/:id` | — | Saved paper or 404 |

Invalid configs return 400 with a clear error.

## AI usage disclosure

I wrote the question text manually; teachers should review it before use. I used Cursor/LLM assistance for code structure, tests, and documentation—not for unverified bulk question generation.
