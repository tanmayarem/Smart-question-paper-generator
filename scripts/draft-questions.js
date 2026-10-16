import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { DIFFICULTIES, TOPICS, TYPES, validateBank } from "./validate-bank.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pendingPath = path.join(rootDir, "data", "pending.json");

function usage() {
  console.log(
    "Usage: node scripts/draft-questions.js <count> <topic> <difficulty> <type>\n" +
      "Example: node scripts/draft-questions.js 3 Biology Medium MCQ",
  );
}

function parseArgs(args) {
  const [countArg, topic, difficulty, type] = args;
  const count = Number(countArg);
  if (
    args.length !== 4 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 50 ||
    !TOPICS.includes(topic) ||
    !DIFFICULTIES.includes(difficulty) ||
    !TYPES.includes(type)
  ) {
    throw new Error("Provide a count from 1 to 50 and a valid topic, difficulty, and type.");
  }
  return { count, topic, difficulty, type };
}

function readPending() {
  if (!fs.existsSync(pendingPath)) return [];
  const pending = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
  if (
    !Array.isArray(pending) ||
    pending.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        !["pending", "approved", "rejected"].includes(item.status) ||
        !item.question ||
        typeof item.question !== "object",
    )
  ) {
    throw new Error(`${pendingPath} must contain an array of question entries with statuses.`);
  }
  return pending;
}

async function requestDrafts({ count, topic, difficulty, type }, apiKey) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Draft original secondary-school Science exam questions. Be factually careful, " +
            "use clear language, and return only a JSON object with a questions array. " +
            "Each question must use exactly the requested question fields.",
        },
        {
          role: "user",
          content: `Draft exactly ${count} distinct candidate questions for:
subject: Science
topic: ${topic}
difficulty: ${difficulty}
type: ${type}

Return {"questions":[...]} where every question has these fields:
{"id":"temporary id","subject":"Science","topic":"${topic}","difficulty":"${difficulty}","type":"${type}","marks":number,"prompt":"...","options":null or four strings,"answer":"..."}
MCQ questions must be exactly 1 mark and have four options, with answer exactly matching one option. Short Answer questions must be 2 or 3 marks with options null. Long Answer questions must be 4 or 5 marks with options null. Include a concise accurate answer or marking guide in answer. Do not include status in the question.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`LLM API returned non-JSON data (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(
      `LLM API request failed (HTTP ${response.status}): ${
        payload.error?.message || "no error detail"
      }`,
    );
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM API response did not include a message.");
  }
  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON instead of a questions object.");
  }
  if (!Array.isArray(result?.questions) || result.questions.length !== count) {
    throw new Error(`LLM must return exactly ${count} questions.`);
  }
  return result.questions;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }
  const request = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY in your environment before drafting questions.");
  }

  const drafts = await requestDrafts(request, apiKey);
  const timestamp = new Date().toISOString();
  const questions = drafts.map((question, index) => ({
    ...question,
    id: `PENDING-${randomUUID()}-${index + 1}`,
    subject: "Science",
  }));
  for (const question of questions) {
    if (
      question.topic !== request.topic ||
      question.difficulty !== request.difficulty ||
      question.type !== request.type
    ) {
      throw new Error("LLM returned a question that does not match the requested topic/difficulty/type.");
    }
  }
  const errors = validateBank(questions);
  if (errors.length) {
    throw new Error(`Draft questions failed validation:\n${errors.join("\n")}`);
  }
  const prompts = questions.map((question) => question.prompt.trim().toLowerCase());
  if (new Set(prompts).size !== prompts.length) {
    throw new Error("LLM returned duplicate question prompts; no drafts were saved.");
  }

  const pending = readPending();
  pending.push(
    ...questions.map((question) => ({
      status: "pending",
      createdAt: timestamp,
      question,
    })),
  );
  fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
  fs.writeFileSync(pendingPath, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
  console.log(`Added ${questions.length} pending question(s) to ${pendingPath}.`);
  console.log("Review each draft with: npm run approve-questions");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { parseArgs, requestDrafts };
