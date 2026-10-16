import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  generatePaper,
  validateConfig,
  swapQuestion,
  computeDeviations,
  paperStatusLabel,
} from "../src/engine.js";
import { createPaperStore } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

/**
 * @param {{ bank?: object[], dataDir?: string, staticDir?: string|null }} [options]
 */
export function createApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const bankPath = path.join(rootDir, "src", "questions.json");
  const bank = options.bank ?? JSON.parse(fs.readFileSync(bankPath, "utf8"));
  const questionsById = new Map(bank.map((question) => [question.id, question]));
  const store = createPaperStore(options.dataDir ?? path.join(rootDir, "data"));

  function validatePaper(paper) {
    if (!Array.isArray(paper) || paper.length === 0) {
      return { error: "Request must include a non-empty paper array." };
    }
    const ids = new Set();
    const canonicalPaper = [];
    for (const question of paper) {
      if (!question || typeof question.id !== "string" || !questionsById.has(question.id)) {
        return { error: "Paper contains a question that is not in the question bank." };
      }
      if (ids.has(question.id)) {
        return { error: `Paper contains duplicate question ID "${question.id}".` };
      }
      ids.add(question.id);
      canonicalPaper.push(questionsById.get(question.id));
    }
    return { paper: canonicalPaper };
  }

  app.get("/api/questions", (_req, res) => {
    res.json({ count: bank.length, questions: bank });
  });

  app.post("/api/generate", (req, res) => {
    const config = req.body?.config;
    const seed = req.body?.seed ?? 1;
    const validation = validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    if (!Number.isSafeInteger(seed)) {
      return res.status(400).json({ error: "Seed must be a whole number." });
    }
    const result = generatePaper(bank, config, { seed });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ ...result, seed, status: paperStatusLabel(result) });
  });

  app.post("/api/swap", (req, res) => {
    const { paper, questionId, config } = req.body ?? {};
    const validation = validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    if (typeof questionId !== "string" || !questionId) {
      return res.status(400).json({ error: "Request must include a questionId." });
    }
    const paperValidation = validatePaper(paper);
    if (paperValidation.error) {
      return res.status(400).json({ error: paperValidation.error });
    }
    const result = swapQuestion(bank, paperValidation.paper, config, questionId);
    const marks = result.paper.reduce((s, q) => s + q.marks, 0);
    const deviations = computeDeviations(result.paper, config);
    const exactTotal = marks === config.total;
    const status = paperStatusLabel({ exactTotal, deviations });
    res.json({
      ...result,
      exactTotal,
      deviations,
      status,
    });
  });

  app.post("/api/papers", (req, res) => {
    const { config, paper, seed, title } = req.body ?? {};
    const validation = validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const paperValidation = validatePaper(paper);
    if (paperValidation.error) {
      return res.status(400).json({ error: paperValidation.error });
    }
    if (seed != null && !Number.isSafeInteger(seed)) {
      return res.status(400).json({ error: "Seed must be a whole number." });
    }
    if (title != null && typeof title !== "string") {
      return res.status(400).json({ error: "Title must be a string." });
    }
    const saved = store.save({ config, paper: paperValidation.paper, seed, title });
    res.status(201).json(saved);
  });

  app.get("/api/papers/:id", (req, res) => {
    const saved = store.load(req.params.id);
    if (!saved) return res.status(404).json({ error: "Paper not found." });
    res.json(saved);
  });

  const staticDir = options.staticDir ?? null;
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use((error, _req, res, next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return res.status(400).json({ error: "Request body must contain valid JSON." });
    }
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body is too large." });
    }
    return next(error);
  });

  return app;
}
