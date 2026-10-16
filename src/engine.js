/** Pure selection engine — no DOM. */

export const DIMENSIONS = [
  { key: "difficulty", items: ["Easy", "Medium", "Hard"], label: "Difficulty" },
  { key: "topic", items: ["Biology", "Chemistry", "Physics"], label: "Topic" },
  { key: "type", items: ["MCQ", "Short Answer", "Long Answer"], label: "Question type" },
];

const PAIR_CHECKS = [
  { name: "topic×difficulty", keys: ["topic", "difficulty"] },
  { name: "topic×type", keys: ["topic", "type"] },
];

/** @param {number} seed */
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {number} total @param {Record<string, number>} mix */
export function targetMarksFor(total, mix) {
  return Object.fromEntries(Object.entries(mix).map(([k, p]) => [k, (total * p) / 100]));
}

/**
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateConfig(config) {
  if (!config || typeof config.total !== "number" || !Number.isFinite(config.total)) {
    return { valid: false, error: "Total marks must be a valid number." };
  }
  if (!Number.isInteger(config.total)) {
    return { valid: false, error: "Total marks must be a whole number." };
  }
  const total = config.total;
  if (total < 5 || total > 60) {
    return { valid: false, error: "Choose a total between 5 and 60 marks." };
  }
  if (!config.mixes || typeof config.mixes !== "object") {
    return { valid: false, error: "Mix configuration is missing." };
  }
  for (const dim of DIMENSIONS) {
    const mix = config.mixes[dim.key];
    if (!mix || typeof mix !== "object") {
      return { valid: false, error: `${dim.label}: mix is missing.` };
    }
    const vals = dim.items.map((item) => mix[item]);
    if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
      return { valid: false, error: `${dim.label}: percentages must be between 0 and 100.` };
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      return { valid: false, error: `${dim.label}: percentages must add up to 100% (currently ${sum}%).` };
    }
  }
  return { valid: true };
}

/** @param {Question[]} bank @param {(q: Question) => boolean} pred */
function sumMarks(bank, pred = () => true) {
  return bank.reduce((s, q) => (pred(q) ? s + q.marks : s), 0);
}

/** @param {Question[]} bank */
function marksByKey(bank, key) {
  const out = {};
  for (const q of bank) {
    out[q[key]] = (out[q[key]] || 0) + q.marks;
  }
  return out;
}

/** @param {Question[]} bank @param {string[]} keys */
function marksByPair(bank, keys) {
  const out = {};
  for (const q of bank) {
    const label = keys.map((k) => q[k]).join(" · ");
    out[label] = (out[label] || 0) + q.marks;
  }
  return out;
}

/**
 * @param {Question[]} bank
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 */
export function analyzeFeasibility(bank, config) {
  const conflicts = [];
  const total = config.total;

  for (const dim of DIMENSIONS) {
    const targets = targetMarksFor(total, config.mixes[dim.key]);
    const available = marksByKey(bank, dim.key);
    for (const item of dim.items) {
      const requested = targets[item] ?? 0;
      const avail = available[item] || 0;
      if (requested > avail + 1e-9) {
        conflicts.push(
          `${item} (${dim.label}): requested ${formatMarks(requested)} marks, only ${avail} available`,
        );
      }
    }
  }

  for (const { name, keys } of PAIR_CHECKS) {
    const [topicKey, secondKey] = keys;
    const topics = DIMENSIONS.find((d) => d.key === "topic").items;
    const secondItems = DIMENSIONS.find((d) => d.key === secondKey).items;
    for (const topic of topics) {
      for (const second of secondItems) {
        const requested =
          (total * (config.mixes.topic[topic] ?? 0) * (config.mixes[secondKey][second] ?? 0)) /
          10000;
        if (requested < 0.05) continue;
        const availMarks = sumMarks(
          bank,
          (q) => q[topicKey] === topic && q[secondKey] === second,
        );
        if (requested > availMarks + 1e-9) {
          const readable = `${second} ${topic}`;
          conflicts.push(
            `${readable}: requested ${formatMarks(requested)} marks, only ${availMarks} available`,
          );
        }
      }
    }
  }

  if (!canMakeExactTotalFromBank(bank, total)) {
    conflicts.push(
      `Total marks: requested ${total}, but no combination of bank questions sums to exactly ${total}`,
    );
  }

  const suggestedMix = suggestNearestFeasibleMix(bank, config, conflicts);
  return { conflicts, suggestedMix };
}

function formatMarks(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** @param {Question[]} bank @param {number} target */
function canMakeExactTotalFromBank(bank, target) {
  const dp = new Uint8Array(target + 1);
  dp[0] = 1;
  for (const q of bank) {
    for (let t = target; t >= q.marks; t--) {
      if (dp[t - q.marks]) dp[t] = 1;
    }
  }
  return dp[target] === 1;
}

/**
 * @param {Question[]} bank
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @param {string[]} conflicts
 */
function suggestNearestFeasibleMix(bank, config, conflicts) {
  const total = config.total;
  const suggested = {};
  for (const dim of DIMENSIONS) {
    const caps = {};
    const available = marksByKey(bank, dim.key);
    let raw = {};
    let sumRaw = 0;
    for (const item of dim.items) {
      const requested = config.mixes[dim.key][item] ?? 0;
      const availMarks = available[item] || 0;
      const capPct = total > 0 ? Math.min(requested, (availMarks / total) * 100) : 0;
      caps[item] = capPct;
      raw[item] = capPct;
      sumRaw += capPct;
    }
    if (sumRaw <= 0) {
      suggested[dim.key] = Object.fromEntries(dim.items.map((i) => [i, Math.floor(100 / dim.items.length)]));
      continue;
    }
    const scaled = {};
    let roundedSum = 0;
    const entries = dim.items.map((item) => {
      const v = Math.round((raw[item] / sumRaw) * 100);
      return [item, v];
    });
    for (const [item, v] of entries) {
      scaled[item] = v;
      roundedSum += v;
    }
    let diff = 100 - roundedSum;
    const order = [...dim.items].sort(
      (a, b) => (available[b] || 0) - (available[a] || 0) || a.localeCompare(b),
    );
    let i = 0;
    while (diff !== 0 && i < 200) {
      const item = order[i % order.length];
      if (diff > 0) {
        scaled[item] += 1;
        diff -= 1;
      } else if (scaled[item] > 0) {
        scaled[item] -= 1;
        diff += 1;
      }
      i += 1;
    }
    suggested[dim.key] = scaled;
  }
  return suggested;
}

/** @param {Question[]} paper @param {{ total: number, mixes: Record<string, Record<string, number>> }} config */
export function computeDeviations(paper, config) {
  const deviations = {};
  const paperTotal = paper.reduce((s, q) => s + q.marks, 0);
  for (const dim of DIMENSIONS) {
    deviations[dim.key] = {};
    const targets = targetMarksFor(config.total, config.mixes[dim.key]);
    const actual = Object.fromEntries(dim.items.map((x) => [x, 0]));
    for (const q of paper) actual[q[dim.key]] += q.marks;
    for (const item of dim.items) {
      const target = targets[item] ?? 0;
      const act = actual[item] || 0;
      deviations[dim.key][item] = {
        target,
        actual: act,
        delta: act - target,
      };
    }
  }
  deviations._paperTotal = paperTotal;
  return deviations;
}

/** @param {{ exactTotal: boolean, deviations: Record<string, Record<string, { delta: number }>>, error?: string|null }} result */
export function paperStatusLabel(result) {
  if (result.error) return { label: "Invalid configuration", kind: "error" };
  if (!result.exactTotal) return { label: "Total not reachable", kind: "error" };
  const dev = totalDeviation(result.deviations);
  if (dev <= 0.01) return { label: "Exact match", kind: "ok" };
  return { label: "Total met, mix approximate", kind: "warn" };
}

/** @param {Record<string, Record<string, { delta: number }>>} deviations */
function totalDeviation(deviations) {
  let err = 0;
  for (const dim of DIMENSIONS) {
    for (const item of dim.items) {
      err += Math.abs(deviations[dim.key][item].delta);
    }
  }
  return err;
}

/** @param {Question[]} paper @param {{ total: number, mixes: Record<string, Record<string, number>> }} config */
function deviationScore(paper, config) {
  return totalDeviation(computeDeviations(paper, config));
}

function marginalGain(q, paper, config) {
  let gain = 0;
  for (const dim of DIMENSIONS) {
    const targets = targetMarksFor(config.total, config.mixes[dim.key]);
    const actual = Object.fromEntries(dim.items.map((x) => [x, 0]));
    for (const x of paper) actual[x[dim.key]] += x.marks;
    const k = q[dim.key];
    gain +=
      Math.abs(actual[k] - targets[k]) -
      Math.abs(actual[k] + q.marks - targets[k]);
    gain -= Math.max(0, actual[k] + q.marks - targets[k]) * 0.35;
  }
  return gain;
}

/**
 * @param {Question[]} bank
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @param {Question[]} locked
 * @param {() => number} rng
 */
function greedyBuild(bank, config, locked, rng) {
  const lockedIds = new Set(locked.map((q) => q.id));
  let paper = [...locked];
  let used = new Set(lockedIds);
  let marks = locked.reduce((s, q) => s + q.marks, 0);
  const pool = bank.filter((q) => !lockedIds.has(q.id));
  let steps = 0;
  while (marks < config.total && steps < 40) {
    steps += 1;
    const left = config.total - marks;
    const candidates = pool.filter((q) => !used.has(q.id) && q.marks <= left);
    if (!candidates.length) break;
    const ranked = candidates
      .map((q) => ({ q, gain: marginalGain(q, paper, config) + rng() * 3.2 }))
      .sort((a, b) => b.gain - a.gain);
    const shortlist = ranked.slice(0, Math.min(4, ranked.length));
    const weights = shortlist.map((_, i) => Math.max(0.15, 4 - i));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let pick = shortlist[0].q;
    for (let i = 0; i < shortlist.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = shortlist[i].q;
        break;
      }
    }
    paper.push(pick);
    used.add(pick.id);
    marks += pick.marks;
  }
  return { paper, marks };
}

/**
 * @param {Question[]} paper
 * @param {Question[]} bank
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @param {() => number} rng
 * @param {number} deadline
 */
function localSearch(paper, bank, config, rng, deadline) {
  let best = [...paper];
  let bestDev = deviationScore(best, config);
  if (bestDev === 0) return best;

  const usedIds = () => new Set(best.map((q) => q.id));
  let iter = 0;
  while (Date.now() < deadline && iter < 5000) {
    iter += 1;
    if (bestDev === 0) break;
    const i = Math.floor(rng() * best.length);
    const oldQ = best[i];
    const used = usedIds();
    used.delete(oldQ.id);
    const candidates = bank.filter((q) => !used.has(q.id) && q.marks === oldQ.marks);
    if (!candidates.length) continue;
    const j = Math.floor(rng() * candidates.length);
    const next = candidates[j];
    const trial = best.slice();
    trial[i] = next;
    const dev = deviationScore(trial, config);
    if (dev <= bestDev) {
      best = trial;
      bestDev = dev;
    }
  }
  return best;
}

/**
 * @param {Question[]} bank
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @param {{ seed?: number, locked?: Question[], timeLimitMs?: number }} [options]
 */
export function generatePaper(bank, config, options = {}) {
  const validation = validateConfig(config);
  if (!validation.valid) {
    return {
      paper: [],
      exactTotal: false,
      deviations: {},
      conflicts: [],
      suggestedMix: null,
      error: validation.error,
    };
  }

  const seed = options.seed ?? 1;
  const rng = createRng(seed);
  const timeLimitMs = options.timeLimitMs ?? 250;
  const deadline = Date.now() + timeLimitMs;
  const locked = options.locked ?? [];

  const { conflicts, suggestedMix } = analyzeFeasibility(bank, config);

  const maxRestarts = 100;
  let best = null;
  let bestMarks = -1;
  let bestDev = Infinity;

  for (let run = 0; run < maxRestarts && Date.now() < deadline; run++) {
    const { paper, marks } = greedyBuild(bank, config, locked, rng);
    const exact = marks === config.total;
    let candidate = paper;
    if (exact) {
      candidate = localSearch(paper, bank, config, rng, deadline);
    }
    const dev = deviationScore(candidate, config);
    const candMarks = candidate.reduce((s, q) => s + q.marks, 0);
    const better =
      !best ||
      (exact && candMarks === config.total && (!best.exact || dev < bestDev)) ||
      (!best.exact && candMarks > bestMarks) ||
      (candMarks === bestMarks && dev < bestDev);
    if (better) {
      best = { paper: candidate, exact: candMarks === config.total, dev };
      bestMarks = candMarks;
      bestDev = dev;
    }
    if (best.exact && bestDev === 0) break;
  }

  const paper = best?.paper ?? locked;
  const paperMarks = paper.reduce((s, q) => s + q.marks, 0);
  const exactTotal = paperMarks === config.total;
  const deviations = computeDeviations(paper, config);

  return {
    paper,
    exactTotal,
    deviations,
    conflicts,
    suggestedMix,
    error: null,
  };
}

/**
 * Swap one question for another with the same mark value; other IDs unchanged.
 * @param {Question[]} bank
 * @param {Question[]} paper
 * @param {{ total: number, mixes: Record<string, Record<string, number>> }} config
 * @param {string} questionId
 */
const SWAP_TIERS = [
  {
    level: "full",
    label: "same marks, topic, difficulty and type",
    match: (old, q) =>
      q.marks === old.marks &&
      q.topic === old.topic &&
      q.difficulty === old.difficulty &&
      q.type === old.type,
  },
  {
    level: "type",
    label: "same marks and question type",
    match: (old, q) => q.marks === old.marks && q.type === old.type,
  },
  {
    level: "marks",
    label: "same marks only",
    match: (old, q) => q.marks === old.marks,
  },
];

export function swapQuestion(bank, paper, config, questionId) {
  const old = paper.find((q) => q.id === questionId);
  if (!old) {
    return { paper, swapped: false, swapLevel: null, message: "Question not found in paper." };
  }
  const fixed = paper.filter((q) => q.id !== questionId);
  const used = new Set(fixed.map((q) => q.id));
  const pool = bank.filter((q) => q.id !== old.id && !used.has(q.id));

  for (const tier of SWAP_TIERS) {
    const candidates = pool.filter((q) => tier.match(old, q));
    if (!candidates.length) continue;
    let best = null;
    for (const candidate of candidates) {
      const trial = paper.map((q) => (q.id === questionId ? candidate : q));
      const dev = deviationScore(trial, config);
      if (!best || dev < best.dev) best = { candidate, dev, trial };
    }
    return {
      paper: best.trial,
      swapped: true,
      swapLevel: tier.level,
      fromId: old.id,
      toId: best.candidate.id,
      message: `Swapped using ${tier.label}.`,
    };
  }

  return {
    paper,
    swapped: false,
    swapLevel: null,
    message:
      "No replacement found: no unused question shares the same marks (required to keep the total unchanged).",
  };
}
