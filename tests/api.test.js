import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../server/createApp.js";

const defaultConfig = {
  total: 20,
  mixes: {
    difficulty: { Easy: 30, Medium: 50, Hard: 20 },
    topic: { Biology: 40, Chemistry: 30, Physics: 30 },
    type: { MCQ: 40, "Short Answer": 40, "Long Answer": 20 },
  },
};

describe("API", () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  it("POST /api/generate rejects invalid mix with 400", async () => {
    const bad = {
      ...defaultConfig,
      mixes: {
        ...defaultConfig.mixes,
        difficulty: { Easy: 30, Medium: 50, Hard: 10 },
      },
    };
    const res = await request(app).post("/api/generate").send({ config: bad, seed: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/add up to 100%/i);

    const fractional = await request(app)
      .post("/api/generate")
      .send({ config: { ...defaultConfig, total: 20.5 } });
    expect(fractional.status).toBe(400);
    expect(fractional.body.error).toMatch(/whole number/i);
  });

  it("POST /api/generate returns exact total for default config", async () => {
    const res = await request(app).post("/api/generate").send({ config: defaultConfig, seed: 7 });
    expect(res.status).toBe(200);
    expect(res.body.exactTotal).toBe(true);
    expect(res.body.status.label).toMatch(/Exact match|Total met, mix approximate/);
    const marks = res.body.paper.reduce((s, q) => s + q.marks, 0);
    expect(marks).toBe(20);

    const swap = await request(app).post("/api/swap").send({
      paper: res.body.paper,
      questionId: res.body.paper[0].id,
      config: defaultConfig,
    });
    expect(swap.status).toBe(200);
    expect(swap.body.swapped).toBe(true);
    expect(swap.body.swapLevel).toMatch(/^(full|type|marks)$/);
    expect(swap.body.message).toMatch(/Swapped using/);

  });

  it("GET /api/questions returns the question bank", async () => {
    const questions = await request(app).get("/api/questions");
    expect(questions.status).toBe(200);
    expect(questions.body.count).toBeGreaterThan(0);
    expect(questions.body.questions).toHaveLength(questions.body.count);
  });
});
