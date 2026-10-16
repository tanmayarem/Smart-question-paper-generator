import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bankPath = path.join(rootDir, "src", "questions.json");
const pendingPath = path.join(rootDir, "data", "pending.json");
const validatorPath = path.join(rootDir, "scripts", "validate-bank.js");
const topicPrefixes = { Biology: "B", Chemistry: "C", Physics: "P" };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writePending(pending) {
  fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
  fs.writeFileSync(pendingPath, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
}

function nextId(bank, topic) {
  const prefix = topicPrefixes[topic];
  if (!prefix) throw new Error(`Cannot assign an ID for unknown topic "${topic}".`);
  const max = bank.reduce((highest, question) => {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(question.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

function appendAfterValidation(
  question,
  { bankFile = bankPath, validatorFile = validatorPath, workingDir = rootDir } = {},
) {
  const bank = readJson(bankFile);
  const approvedQuestion = { ...question, id: nextId(bank, question.topic) };
  const proposedBank = [...bank, approvedQuestion];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paperpilot-bank-check-"));
  const candidatePath = path.join(tempDir, "questions.json");

  try {
    fs.writeFileSync(candidatePath, `${JSON.stringify(proposedBank, null, 2)}\n`, "utf8");
    const validation = spawnSync(process.execPath, [validatorFile, candidatePath], {
      cwd: workingDir,
      encoding: "utf8",
    });
    if (validation.error) throw validation.error;
    if (validation.stdout) process.stdout.write(validation.stdout);
    if (validation.stderr) process.stderr.write(validation.stderr);
    if (validation.status !== 0) {
      console.error("Question was not appended because bank validation failed.");
      return null;
    }

    const replacementPath = `${bankFile}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(replacementPath, `${JSON.stringify(proposedBank, null, 2)}\n`, "utf8");
      fs.renameSync(replacementPath, bankFile);
    } finally {
      if (fs.existsSync(replacementPath)) fs.unlinkSync(replacementPath);
    }
    return approvedQuestion;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function printQuestion(question, index, count) {
  console.log(`\n--- Pending question ${index + 1} of ${count} ---`);
  console.log(JSON.stringify(question, null, 2));
}

async function main() {
  if (!fs.existsSync(pendingPath)) {
    console.log("No pending drafts found. Run npm run draft-questions first.");
    return;
  }

  const pending = readJson(pendingPath);
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

  const queued = pending
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.status === "pending");
  if (!queued.length) {
    console.log("There are no pending questions to review.");
    return;
  }

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const { entry, index } of queued) {
      let decided = false;
      while (!decided) {
        printQuestion(entry.question, index, pending.length);
        const action = (await terminal.question("[a]pprove, [e]dit, [r]eject, [s]kip, [q]uit: "))
          .trim()
          .toLowerCase();
        if (action === "q") return;
        if (action === "s" || action === "") break;
        if (action === "e") {
          const edited = await terminal.question("Enter the complete edited question as one JSON line: ");
          try {
            const question = JSON.parse(edited);
            if (!question || typeof question !== "object" || Array.isArray(question)) {
              throw new Error("Question must be a JSON object.");
            }
            entry.question = question;
          } catch (error) {
            console.error(`Edit not applied: ${error.message}`);
          }
          continue;
        }
        if (action === "r") {
          entry.status = "rejected";
          entry.decidedAt = new Date().toISOString();
          writePending(pending);
          console.log("Question rejected.");
          decided = true;
          continue;
        }
        if (action !== "a") {
          console.log("Choose a, e, r, s, or q.");
          continue;
        }

        const approved = appendAfterValidation(entry.question);
        if (!approved) continue;
        entry.status = "approved";
        entry.decidedAt = new Date().toISOString();
        entry.approvedQuestionId = approved.id;
        writePending(pending);
        console.log(`Approved and appended as ${approved.id}.`);
        decided = true;
      }
    }
  } finally {
    terminal.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { appendAfterValidation, nextId };
