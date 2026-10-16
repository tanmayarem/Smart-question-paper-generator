import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultBankPath = path.join(scriptDir, "..", "src", "questions.json");

export const TOPICS = ["Biology", "Chemistry", "Physics"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"];
export const TYPES = ["MCQ", "Short Answer", "Long Answer"];
export const REQUIRED_FIELDS = [
  "id",
  "subject",
  "topic",
  "difficulty",
  "type",
  "marks",
  "prompt",
  "options",
  "answer",
];

export function validateBank(bank) {
  if (!Array.isArray(bank)) return ["Bank must be a JSON array."];

  const errors = [];
  const ids = new Set();
  for (const question of bank) {
    const id = question && typeof question.id === "string" ? question.id : "?";
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      errors.push("Question must be a JSON object.");
      continue;
    }
    for (const key of REQUIRED_FIELDS) {
      if (!(key in question)) errors.push(`${id}: missing field "${key}"`);
    }
    const unexpectedFields = Object.keys(question).filter((key) => !REQUIRED_FIELDS.includes(key));
    if (unexpectedFields.length) {
      errors.push(`${id}: unexpected field(s): ${unexpectedFields.join(", ")}`);
    }
    if (typeof question.id !== "string" || !question.id.trim()) {
      errors.push(`${id}: id must be a non-empty string`);
    } else if (ids.has(question.id)) {
      errors.push(`Duplicate id ${question.id}`);
    } else {
      ids.add(question.id);
    }
    if (question.subject !== "Science") errors.push(`${id}: subject must be Science`);
    if (!TOPICS.includes(question.topic)) errors.push(`${id}: invalid topic ${question.topic}`);
    if (!DIFFICULTIES.includes(question.difficulty)) {
      errors.push(`${id}: invalid difficulty`);
    }
    if (!TYPES.includes(question.type)) errors.push(`${id}: invalid type`);
    if (!Number.isInteger(question.marks)) errors.push(`${id}: marks must be a whole number`);

    if (question.type === "MCQ") {
      if (question.marks !== 1) errors.push(`${id}: MCQ must be 1 mark`);
      if (
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        question.options.some((option) => typeof option !== "string" || !option.trim())
      ) {
        errors.push(`${id}: MCQ must have exactly 4 non-empty text options`);
      } else if (!question.options.includes(question.answer)) {
        errors.push(`${id}: MCQ answer must be one of the options`);
      }
    } else {
      if (question.options !== null) errors.push(`${id}: non-MCQ options must be null`);
      if (
        question.type === "Short Answer" &&
        (!Number.isInteger(question.marks) || question.marks < 2 || question.marks > 3)
      ) {
        errors.push(`${id}: Short Answer marks must be 2–3`);
      }
      if (
        question.type === "Long Answer" &&
        (!Number.isInteger(question.marks) || question.marks < 4 || question.marks > 5)
      ) {
        errors.push(`${id}: Long Answer marks must be 4–5`);
      }
    }
    if (typeof question.prompt !== "string" || !question.prompt.trim()) {
      errors.push(`${id}: empty prompt`);
    }
    if (typeof question.answer !== "string" || !question.answer.trim()) {
      errors.push(`${id}: empty answer`);
    }
  }
  return errors;
}

function countBy(bank, key) {
  return bank.reduce((counts, question) => {
    counts[question[key]] = (counts[question[key]] || 0) + 1;
    return counts;
  }, {});
}

function validateFile(filePath) {
  let bank;
  try {
    bank = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Could not read valid JSON from ${filePath}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const errors = validateBank(bank);
  if (errors.length) {
    errors.forEach((error) => console.error(`ERROR: ${error}`));
    console.error(`\nValidation failed with ${errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Questions: ${bank.length}`);
  console.log("By topic:", countBy(bank, "topic"));
  console.log("By difficulty:", countBy(bank, "difficulty"));
  console.log("By type:", countBy(bank, "type"));
  console.log("\nValidation passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3) {
    console.error("Usage: node scripts/validate-bank.js [path-to-bank.json]");
    process.exitCode = 2;
  } else {
    validateFile(process.argv[2] ? path.resolve(process.argv[2]) : defaultBankPath);
  }
}
