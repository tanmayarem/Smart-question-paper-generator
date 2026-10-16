# PaperPilot — Smart Question Paper Generator (MVP)

A small, browser-only prototype for generating a school-level Science question paper from teacher-defined constraints.

## Run it
1. Download/unzip the project.
2. Open `index.html` in a modern browser. No build step, API key, package install, or backend is required.
3. Edit the marks and mix percentages, then choose **Generate paper**.
4. Use **Show answers** to reveal the answer guide, **Print** for a print-friendly view, and **Swap** to replace one question without rebuilding the rest.

For a local server, run `python -m http.server 8000` in this directory and open `http://localhost:8000`.

## Scope
- One subject: Science, with Biology, Chemistry and Physics topic buckets.
- A curated, illustrative bank of 36 tagged questions.
- Total marks, difficulty mix, topic mix and question-type mix.
- Breakdown of target versus achieved marks and a warning when the requested mix is not met.
- Single-question swap that preserves the marks and leaves the other questions untouched whenever a suitable replacement exists.
- Browser-only implementation; settings and paper are not saved to a server.

## How the selection works
The percentages represent **shares of total marks**, not shares of question count. This is more coherent when a 1-mark MCQ and a 5-mark long-answer question coexist. Each target is converted into a desired mark budget for each category.

The generator uses a bounded randomized greedy search with multiple restarts:
1. It builds a paper without reusing a question.
2. At each step it considers questions that fit the remaining mark budget.
3. It prefers questions that fill underrepresented difficulty/topic/type mark budgets, with a small random element to explore alternatives.
4. It keeps the best paper found that exactly reaches the requested total marks.
5. It compares the achieved marks with each requested category budget and displays the discrepancy.

This is a practical small-bank heuristic, not a proof that the globally optimal combination was found. If the bank cannot reach the requested total exactly, it reports the closest paper found rather than pretending the total is correct. A category deficit can occur even when the overall mark total is exact.

## Conflict handling
The generator does not silently edit the teacher's percentages. It reports target versus achieved marks for each category and shows a warning when a mix differs. For example, if the bank contains too few hard questions in a requested topic, the generated paper may still reach the total marks while missing the requested hard/topic share. The teacher can change the mix, use a different bank, or accept the visible best-effort paper.

A question swap keeps every other question fixed. It searches for an unused replacement with the same mark value and chooses the candidate that best improves the paper's constraint score. If no replacement of the same mark value exists, the tool explains that a marks-preserving swap is unavailable.

## Why no generative AI in the core?
The question bank is curated and stored as local JSON, so question wording and answer guides can be inspected. A language model could produce fluent but incorrect questions, mismatched answer keys, or content outside the intended level. An LLM is not needed to solve the main engineering problem: constrained selection.

A future hybrid version could use an LLM to draft candidate questions, but would need to validate the question, answer, syllabus/topic, difficulty, type and mark value before adding it to the approved bank. The constraint engine should remain deterministic and independent of the model.

## Limitations / what I would improve next
- The bank is small and illustrative, not aligned to a named curriculum or validated by a subject teacher.
- The search is heuristic and may miss a better combination. A future version could use integer programming/constraint programming for optimal selection.
- The current percentages are mark-weighted. Some teachers may want question-count percentages or exact per-section quotas instead.
- The answer key is a short guide, not a detailed marking rubric.
- There is no persistence, authentication, syllabus upload, duplicate detection, or server-side PDF export.
- Add automated tests for exact total marks, mix calculations, swap invariants, and deliberately infeasible pools; then expand the reviewed bank.

## Proud of
The important part is the separation between the question bank, selection logic and UI, with target-versus-actual breakdowns rather than silently claiming the constraints were satisfied.

## Weakest part
The small curated bank and heuristic search limit the range and optimality of papers. I would spend the next iteration on a larger teacher-reviewed bank and a formal constraint solver, not on adding more UI features.

## Sample paper
See [`sample-paper.md`](sample-paper.md). This is an example output format; regenerate the app to see a paper selected from the current bank.
