import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bankPath = path.join(__dirname, "..", "src", "questions.json");

const TOPICS = ["Biology", "Chemistry", "Physics"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const TYPES = ["MCQ", "Short Answer", "Long Answer"];
const REQUIRED = [
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

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
let errors = 0;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors += 1;
}

if (!Array.isArray(bank)) fail("Bank must be a JSON array.");

const ids = new Set();
for (const q of bank) {
  for (const key of REQUIRED) {
    if (!(key in q)) fail(`${q.id ?? "?"}: missing field "${key}"`);
  }
  if (q.subject !== "Science") fail(`${q.id}: subject must be Science`);
  if (!TOPICS.includes(q.topic)) fail(`${q.id}: invalid topic ${q.topic}`);
  if (!DIFFICULTIES.includes(q.difficulty)) fail(`${q.id}: invalid difficulty`);
  if (!TYPES.includes(q.type)) fail(`${q.id}: invalid type`);
  if (ids.has(q.id)) fail(`Duplicate id ${q.id}`);
  ids.add(q.id);

  if (q.type === "MCQ") {
    if (q.marks !== 1) fail(`${q.id}: MCQ must be 1 mark`);
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      fail(`${q.id}: MCQ must have exactly 4 options`);
    } else if (!q.options.includes(q.answer)) {
      fail(`${q.id}: MCQ answer must be one of the options`);
    }
  } else {
    if (q.options !== null) fail(`${q.id}: non-MCQ options must be null`);
    if (q.type === "Short Answer" && (q.marks < 2 || q.marks > 3)) {
      fail(`${q.id}: Short Answer marks must be 2–3`);
    }
    if (q.type === "Long Answer" && (q.marks < 4 || q.marks > 5)) {
      fail(`${q.id}: Long Answer marks must be 4–5`);
    }
  }
  if (typeof q.prompt !== "string" || !q.prompt.trim()) fail(`${q.id}: empty prompt`);
  if (typeof q.answer !== "string" || !q.answer.trim()) fail(`${q.id}: empty answer`);
}

function countBy(key) {
  const out = {};
  for (const q of bank) {
    out[q[key]] = (out[q[key]] || 0) + 1;
  }
  return out;
}

console.log(`Questions: ${bank.length}`);
console.log("By topic:", countBy("topic"));
console.log("By difficulty:", countBy("difficulty"));
console.log("By type:", countBy("type"));

if (errors) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log("\nValidation passed.");
