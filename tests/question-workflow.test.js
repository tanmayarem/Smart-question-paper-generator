import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendAfterValidation, nextId } from "../scripts/approve.js";
import { parseArgs } from "../scripts/draft-questions.js";
import { validateBank } from "../scripts/validate-bank.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const validatorPath = path.join(rootDir, "scripts", "validate-bank.js");

const validMcq = {
  subject: "Science",
  topic: "Biology",
  difficulty: "Easy",
  type: "MCQ",
  marks: 1,
  prompt: "Which part of a plant absorbs water?",
  options: ["Root hair", "Petal", "Stamen", "Seed coat"],
  answer: "Root hair",
};

describe("question drafting and approval workflow", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paperpilot-workflow-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("validates the existing bank and rejects invalid candidates", () => {
    const bank = JSON.parse(
      fs.readFileSync(path.join(rootDir, "src", "questions.json"), "utf8"),
    );
    expect(validateBank(bank)).toEqual([]);
    expect(
      validateBank([{ ...validMcq, id: "bad", options: ["one", "two"], marks: 2 }]),
    ).toEqual(
      expect.arrayContaining([
        "bad: MCQ must be 1 mark",
        "bad: MCQ must have exactly 4 non-empty text options",
      ]),
    );
    expect(validateBank([{ ...validMcq, id: "bad", status: "pending" }])).toContain(
      "bad: unexpected field(s): status",
    );
  });

  it("checks draft arguments", () => {
    expect(parseArgs(["3", "Biology", "Medium", "MCQ"])).toEqual({
      count: 3,
      topic: "Biology",
      difficulty: "Medium",
      type: "MCQ",
    });
    expect(() => parseArgs(["0", "Biology", "Medium", "MCQ"])).toThrow(/count from 1 to 50/);
    expect(() => parseArgs(["2", "Astronomy", "Easy", "MCQ"])).toThrow(/valid topic/);
  });

  it("assigns the next topic-specific bank ID", () => {
    expect(nextId([{ id: "B02" }, { id: "B09" }, { id: "C30" }], "Biology")).toBe("B10");
    expect(nextId([], "Physics")).toBe("P01");
  });

  it("appends only after the whole proposed bank passes the validator", () => {
    const bankPath = path.join(tempDir, "questions.json");
    fs.writeFileSync(bankPath, "[]\n", "utf8");
    const approved = appendAfterValidation(validMcq, {
      bankFile: bankPath,
      validatorFile: validatorPath,
      workingDir: rootDir,
    });

    expect(approved.id).toBe("B01");
    expect(JSON.parse(fs.readFileSync(bankPath, "utf8"))).toEqual([approved]);

    const rejectedBankPath = path.join(tempDir, "rejected.json");
    fs.writeFileSync(rejectedBankPath, "[]\n", "utf8");
    const invalid = appendAfterValidation({ ...validMcq, marks: 2 }, {
      bankFile: rejectedBankPath,
      validatorFile: validatorPath,
      workingDir: rootDir,
    });
    expect(invalid).toBeNull();
    expect(fs.readFileSync(rejectedBankPath, "utf8")).toBe("[]\n");
  });
});
