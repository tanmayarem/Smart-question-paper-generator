import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  generatePaper,
  validateConfig,
  swapQuestion,
  DIMENSIONS,
} from "../src/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bank = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "src", "questions.json"), "utf8"),
);

const defaultConfig = {
  total: 20,
  mixes: {
    difficulty: { Easy: 30, Medium: 50, Hard: 20 },
    topic: { Biology: 40, Chemistry: 30, Physics: 30 },
    type: { MCQ: 40, "Short Answer": 40, "Long Answer": 20 },
  },
};

describe("generatePaper", () => {
  it("(a) 20-mark default config returns an exact total", () => {
    const result = generatePaper(bank, defaultConfig, { seed: 7 });
    expect(result.error).toBeNull();
    const marks = result.paper.reduce((s, q) => s + q.marks, 0);
    expect(result.exactTotal).toBe(true);
    expect(marks).toBe(20);
  });

  it("(b) 40 marks with specified mixes returns exact total and deviation report", () => {
    const config = {
      total: 40,
      mixes: {
        difficulty: { Easy: 30, Medium: 50, Hard: 20 },
        topic: { Biology: 40, Chemistry: 30, Physics: 30 },
        type: { MCQ: 40, "Short Answer": 40, "Long Answer": 20 },
      },
    };
    const result = generatePaper(bank, config, { seed: 11 });
    const marks = result.paper.reduce((s, q) => s + q.marks, 0);
    expect(result.exactTotal).toBe(true);
    expect(marks).toBe(40);
    for (const dim of DIMENSIONS) {
      for (const item of dim.items) {
        const row = result.deviations[dim.key][item];
        expect(row).toMatchObject({
          target: expect.any(Number),
          actual: expect.any(Number),
          delta: expect.any(Number),
        });
      }
    }
  });

  it("(c) mix summing to 90% is rejected with a clear error", () => {
    const bad = {
      total: 20,
      mixes: {
        difficulty: { Easy: 30, Medium: 50, Hard: 10 },
        topic: { Biology: 40, Chemistry: 30, Physics: 30 },
        type: { MCQ: 40, "Short Answer": 40, "Long Answer": 20 },
      },
    };
    const v = validateConfig(bad);
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/add up to 100%/i);
    const result = generatePaper(bank, bad, { seed: 1 });
    expect(result.paper).toEqual([]);
    expect(result.error).toMatch(/add up to 100%/i);
  });

  it("(d) infeasible 100% Hard Biology MCQ at 40 marks reports conflicts and honest total", () => {
    const config = {
      total: 40,
      mixes: {
        difficulty: { Easy: 0, Medium: 0, Hard: 100 },
        topic: { Biology: 100, Chemistry: 0, Physics: 0 },
        type: { MCQ: 100, "Short Answer": 0, "Long Answer": 0 },
      },
    };
    expect(() => generatePaper(bank, config, { seed: 3 })).not.toThrow();
    const result = generatePaper(bank, config, { seed: 3 });
    expect(result.conflicts.length).toBeGreaterThan(0);
    const marks = result.paper.reduce((s, q) => s + q.marks, 0);
    expect(result.exactTotal).toBe(marks === 40);
    expect(marks).toBeLessThanOrEqual(40);
  });

  it("(e) swap keeps every other question ID and total unchanged", () => {
    const gen = generatePaper(bank, defaultConfig, { seed: 99 });
    expect(gen.exactTotal).toBe(true);
    const swapId = gen.paper[0].id;
    const beforeIds = gen.paper.map((q) => q.id);
    const beforeTotal = gen.paper.reduce((s, q) => s + q.marks, 0);
    const swapped = swapQuestion(bank, gen.paper, defaultConfig, swapId);
    expect(swapped.swapped).toBe(true);
    const afterIds = swapped.paper.map((q) => q.id);
    const afterTotal = swapped.paper.reduce((s, q) => s + q.marks, 0);
    expect(afterTotal).toBe(beforeTotal);
    expect(afterIds.length).toBe(beforeIds.length);
    const unchanged = beforeIds.filter((id) => id !== swapId);
    for (const id of unchanged) {
      expect(afterIds).toContain(id);
    }
    expect(afterIds.filter((id) => id === swapId).length).toBe(0);
  });

  it("(f) no duplicate questions in generated paper", () => {
    const result = generatePaper(bank, defaultConfig, { seed: 21 });
    const ids = result.paper.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("(g) generation completes under 300 ms for 40- and 60-mark papers", () => {
    for (const total of [40, 60]) {
      const config = { ...defaultConfig, total };
      const t0 = performance.now();
      generatePaper(bank, config, { seed: total, timeLimitMs: 250 });
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(300);
    }
  });
});
