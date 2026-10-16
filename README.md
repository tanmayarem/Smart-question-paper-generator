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

To draft questions, set your API key in the environment (PowerShell example), then run:

```powershell
$env:OPENAI_API_KEY = "your-api-key"
npm run draft-questions -- 3 Biology Medium MCQ
npm run approve-questions
```

The script uses OpenAI's API (`gpt-4o-mini` by default; set `OPENAI_MODEL` to change it). Drafts go only to ignored `data/pending.json`. The CLI lets me approve, edit, reject, or skip each one; approval validates the complete proposed bank before adding it. I review drafts for accuracy and syllabus fit.

## Tech stack and architecture

Vite, vanilla JavaScript/CSS, Node, Express, and Vitest. The browser calls `/api/*`; `server/createApp.js` uses `src/engine.js` and `src/questions.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/questions` | Read the question bank |
| POST | `/api/generate` | Generate a paper from `{ config, seed? }` |
| POST | `/api/swap` | Swap a question using `{ paper, questionId, config }` |

## AI usage disclosure

**AI drafts, human approves, engine selects deterministically.** AI only drafts candidates; I review them, and the validator gates bank updates.
