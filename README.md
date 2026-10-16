# PaperPilot

I built PaperPilot to generate printable Science exams from a curated question bank. Its deterministic engine checks marks, topics, difficulty, and question type.

## Approach and why

Seeded search and same-mark swaps find a paper that fits the requested constraints. AI does not select questions, so results and conflicts remain explainable.

## How constraints that don’t fit are handled

Mixes must total 100%. If the bank cannot satisfy a request, PaperPilot shows why and labels the result **Exact match**, **Total met, mix approximate**, or **Total not reachable**. For example: `Hard Biology: requested 40 marks, only 26 available`.

### Where it falls short and next steps

The current version focuses on generating constraint-aware question papers, explaining conflicts, and allowing individual questions to be swapped without regenerating the entire paper. Papers can be printed or exported through the browser's print-to-PDF functionality, but persistent save/load functionality is not currently supported. With more time, I would add a hosted database so teachers could save, retrieve, and manage previously generated papers across sessions.

## One thing I’m proud of / one thing still weak

**Proud of:** Constraint trade-offs are visible, and I can replace one question without losing the rest of the paper.

**Still weak:** The small question bank needs teacher review, and the fast search cannot guarantee the optimal mix.

## How to run and test

```bash
npm install
npm run dev
npm test
npm run validate:bank
npm run build
```

Open http://localhost:5173. Use **Print paper** to print or export a PDF.

## Tech stack and architecture

I use Vite, vanilla JavaScript and CSS, Node, Express, and Vitest. The browser calls `/api/*`; `server/createApp.js` uses the shared engine in `src/engine.js` and the bank in `src/questions.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/questions` | Read the question bank |
| POST | `/api/generate` | Generate a paper from `{ config, seed? }` |
| POST | `/api/swap` | Swap a question using `{ paper, questionId, config }` |

## AI usage disclosure

I wrote the question text manually; teachers should review it before use. I used LLM assistance for code structure, tests, and documentation—not for unverified bulk question generation.
