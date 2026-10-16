const dims = [
  {
    key: "difficulty",
    id: "difficulty-mix",
    sum: "sum-difficulty",
    items: ["Easy", "Medium", "Hard"],
    defaults: [30, 50, 20],
    label: "Difficulty",
  },
  {
    key: "topic",
    id: "topic-mix",
    sum: "sum-topic",
    items: ["Biology", "Chemistry", "Physics"],
    defaults: [40, 30, 30],
    label: "Topic",
  },
  {
    key: "type",
    id: "type-mix",
    sum: "sum-type",
    items: ["MCQ", "Short Answer", "Long Answer"],
    defaults: [40, 40, 20],
    label: "Question type",
  },
];

const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 };
const SECTIONS = [
  { type: "MCQ", letter: "A", title: "Multiple Choice Questions" },
  { type: "Short Answer", letter: "B", title: "Short Answer Questions" },
  { type: "Long Answer", letter: "C", title: "Long Answer Questions" },
];

const state = {
  paper: [],
  lastConfig: null,
  lastResult: null,
  seed: 42,
  showAnswerKey: false,
};

const $ = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function buildMixInputs() {
  dims.forEach((d) => {
    $(d.id).innerHTML = d.items
      .map(
        (item, i) =>
          `<div class="mixrow"><label for="${d.key}-${i}">${item}</label><input type="number" min="0" max="100" step="5" id="${d.key}-${i}" value="${d.defaults[i]}"></div>`,
      )
      .join("");
    d.items.forEach((_, i) => $(`${d.key}-${i}`).addEventListener("input", updateSums));
  });
  updateSums();
}

function readConfig() {
  const total = Math.floor(Number($("total").value));
  const mixes = {};
  dims.forEach((d) => {
    mixes[d.key] = Object.fromEntries(
      d.items.map((item, i) => [item, Number($(`${d.key}-${i}`).value)]),
    );
  });
  return { total, mixes };
}

function updateSums() {
  const c = readConfig();
  dims.forEach((d) => {
    const sum = Object.values(c.mixes[d.key]).reduce((a, b) => a + b, 0);
    $(d.sum).textContent = `${sum}%`;
    $(d.sum).classList.toggle("bad", sum !== 100);
  });
}

function timeAllowedText(totalMarks) {
  const minutes = totalMarks * 2;
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hour${h > 1 ? "s" : ""} ${m} minutes` : `${h} hour${h > 1 ? "s" : ""}`;
}

function targetFor(total, mix) {
  return Object.fromEntries(Object.entries(mix).map(([k, p]) => [k, (total * p) / 100]));
}

function summarize(paper, key, items) {
  const total = paper.reduce((s, q) => s + q.marks, 0);
  return items.map((item) => ({
    item,
    actual: paper.filter((q) => q[key] === item).reduce((s, q) => s + q.marks, 0),
    total,
  }));
}

function orderForExam(paper) {
  const out = [];
  for (const section of SECTIONS) {
    const items = paper
      .filter((q) => q.type === section.type)
      .sort(
        (a, b) =>
          DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] ||
          a.id.localeCompare(b.id),
      );
    if (items.length) out.push({ ...section, items });
  }
  return out;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function renderExamSheet(paper, config) {
  if (!paper.length) {
    $("exam-sheet").innerHTML = '<div class="empty">No questions in this paper.</div>';
    $("answer-key").innerHTML = "";
    return;
  }

  const examName = $("exam-name").value.trim() || "End-of-Term Examination";
  const className = $("class-name").value;
  const sections = orderForExam(paper);
  let num = 0;
  const numbered = sections.map((sec) => ({
    ...sec,
    items: sec.items.map((q) => {
      num += 1;
      return { ...q, num };
    }),
  }));

  const sectionMarks = (type) =>
    paper.filter((q) => q.type === type).reduce((s, q) => s + q.marks, 0);

  let body = "";
  for (const sec of numbered) {
    const sm = sectionMarks(sec.type);
    body += `<h3 class="section-head">Section ${sec.letter} — ${sec.title} (${sm} mark${sm === 1 ? "" : "s"})</h3>`;
    for (const q of sec.items) {
      body += `<article class="exam-q" data-id="${q.id}">
        <span class="qnum">${q.num}.</span>
        <div class="qtext">${esc(q.prompt)}</div>
        <span class="marks">[${q.marks}]</span>
        ${
          q.options
            ? `<ol class="opts" type="A">${q.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>`
            : ""
        }
        <div class="qmeta screen-only">
          <span class="tags"><span class="tag">${q.topic}</span><span class="tag">${q.difficulty}</span><span class="tag">${q.id}</span></span>
          <button type="button" class="swap" data-swap="${q.id}">↻ Swap</button>
        </div>
      </article>`;
    }
  }

  $("exam-sheet").innerHTML = `
    <header class="exam-header">
      <h2>${esc(examName)}</h2>
      <div class="exam-meta">
        <span><strong>Subject:</strong> Science</span>
        <span><strong>Class:</strong> ${esc(className)}</span>
        <span><strong>Time allowed:</strong> ${timeAllowedText(config.total)}</span>
        <span><strong>Maximum marks:</strong> ${config.total}</span>
      </div>
      <div class="exam-instructions">
        <strong>General Instructions</strong>
        <ol>
          <li>All questions are compulsory.</li>
          <li>Section A contains multiple choice questions; choose one option for each.</li>
          <li>Section B and Section C require brief and extended written answers respectively.</li>
          <li>Write clearly and show working where calculations are required.</li>
        </ol>
      </div>
    </header>
    ${body}`;

  const akRows = numbered.flatMap((sec) =>
    sec.items.map(
      (q) =>
        `<div class="ak-row"><span>Q${q.num}.</span><span>${esc(q.answer)}</span></div>`,
    ),
  );
  $("answer-key").innerHTML = `<h2>Answer Key — Science (${config.total} marks)</h2>${akRows.join("")}`;

  document.querySelectorAll("[data-swap]").forEach((btn) =>
    btn.addEventListener("click", () => swapQuestion(btn.dataset.swap)),
  );
}

function renderBreakdowns(paper, config) {
  $("breakdowns").innerHTML = dims
    .map((d) => {
      const target = targetFor(config.total, config.mixes[d.key]);
      const actual = summarize(paper, d.key, d.items);
      return `<div class="breakdown"><h3>${d.label} · marks share</h3>${actual
        .map((row) => {
          const targetMarks = target[row.item] || 0;
          const delta = row.actual - targetMarks;
          const pct = row.total ? (row.actual / row.total) * 100 : 0;
          return `<div class="brow"><span>${row.item}</span><strong>${row.actual} / ${targetMarks.toFixed(1)} marks</strong><span class="diff">${pct.toFixed(0)}% actual · ${delta > 0 ? "+" : ""}${delta.toFixed(1)}</span><span class="diff" style="text-align:right">${config.mixes[d.key][row.item]}% target</span><div class="track"><div class="fill" style="width:${Math.min(100, pct)}%"></div></div></div>`;
        })
        .join("")}</div>`;
    })
    .join("");
}

function renderConflicts(conflicts) {
  if (!conflicts?.length) {
    $("conflicts").innerHTML = "";
    return;
  }
  $("conflicts").innerHTML = `<div class="notice warn"><strong>Feasibility notes from the bank</strong><ul>${conflicts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
}

function renderPaper() {
  const config = state.lastConfig || readConfig();
  const paper = state.paper;
  const result = state.lastResult;
  const marks = paper.reduce((s, q) => s + q.marks, 0);
  const status = result?.status ?? { label: "—", kind: "warn" };

  $("paper-subtitle").textContent = paper.length
    ? `${paper.length} questions · ${marks} marks · seed ${state.seed}`
    : "Set constraints and generate a paper.";

  $("metrics").innerHTML = `
    <div class="metric"><div class="big">${marks}/${config.total}</div><div class="small">Marks achieved / requested</div></div>
    <div class="metric"><div class="big">${paper.length}</div><div class="small">Questions selected</div></div>
    <div class="metric"><div class="big">${status.label}</div><div class="small">Constraint status</div></div>`;

  let notice = "";
  if (status.kind === "error" && !result?.exactTotal) {
    notice = `<div class="notice error"><strong>${status.label}.</strong> This paper totals ${marks} mark${marks === 1 ? "" : "s"}; adjust the total or bank before using it as a final exam.</div>`;
  } else if (status.kind === "warn") {
    notice = `<div class="notice warn"><strong>${status.label}.</strong> Compare the breakdowns below or try swapping a question.</div>`;
  } else if (paper.length) {
    notice = `<div class="notice ok"><strong>${status.label}.</strong> Review content and the answer key before classroom use.</div>`;
  }
  $("status").innerHTML = notice;

  renderConflicts(result?.conflicts ?? []);
  if (paper.length) renderBreakdowns(paper, config);
  else $("breakdowns").innerHTML = "";

  renderExamSheet(paper, config);
  $("answer-key").classList.toggle("hide", !state.showAnswerKey);
  $("answer-key").classList.toggle("print-show", state.showAnswerKey);
  $("answers").textContent = state.showAnswerKey ? "Hide answer key" : "Show answer key";
}

async function generate() {
  const config = readConfig();
  try {
    const result = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ config, seed: state.seed }),
    });
    state.lastConfig = config;
    state.lastResult = result;
    state.paper = result.paper;
    state.showAnswerKey = false;
    renderPaper();
  } catch (e) {
    $("status").innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
  }
}

async function swapQuestion(id) {
  if (!state.lastConfig) return;
  try {
    const result = await api("/api/swap", {
      method: "POST",
      body: JSON.stringify({
        paper: state.paper,
        questionId: id,
        config: state.lastConfig,
      }),
    });
    if (!result.swapped) {
      $("status").innerHTML = `<div class="notice warn">${esc(result.message)}</div>`;
      return;
    }
    state.paper = result.paper;
    state.lastResult = {
      ...state.lastResult,
      paper: result.paper,
      deviations: result.deviations,
      exactTotal: result.exactTotal,
      status: result.status,
    };
    renderPaper();
    $("status").insertAdjacentHTML(
      "afterbegin",
      `<div class="notice ok">${esc(result.message)} (${result.fromId} → ${result.toId})</div>`,
    );
  } catch (e) {
    $("status").innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
  }
}

function init() {
  buildMixInputs();
  $("generate").addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 1e9);
    generate();
  });
  $("regen").addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 1e9);
    generate();
  });
  $("answers").addEventListener("click", () => {
    state.showAnswerKey = !state.showAnswerKey;
    renderPaper();
  });
  $("print").addEventListener("click", () => {
    const prev = state.showAnswerKey;
    state.showAnswerKey = true;
    renderPaper();
    window.print();
    state.showAnswerKey = prev;
    renderPaper();
  });
  $("total").addEventListener("input", updateSums);

  generate().catch(() => {
    $("status").innerHTML =
      '<div class="notice error">Could not reach the API. Run <code>npm run dev</code> so the Vite dev server and API are both up.</div>';
  });
}

init();
