// Question selection.
//
// Pool starts with the first INITIAL_POOL_SIZE questions in file order at p=1.0.
// To pick the next question:
//   1. Random qid from pool
//   2. If it's the same as the last shown, re-roll (unless pool has only one)
//   3. Accept with probability p; otherwise re-roll
// On the last failed re-roll (after MAX_REROLLS) we accept whatever's in hand —
// this guarantees forward progress even if every p has decayed near MIN_P.
//
// On answer:
//   correct -> p *= DECAY_RIGHT       (clamp >= MIN_P)
//   wrong   -> p = 1 - (1 - p) * RECOVERY_WRONG  (clamp <= MAX_P)
// First time a pooled question dips below THRESHOLD, the next un-pooled
// question (in file order) is added to the pool. Questions never leave.

export const DECAY_RIGHT = 0.7;
export const RECOVERY_WRONG = 0.4;
export const MIN_P = 0.05;
export const MAX_P = 0.95;
export const THRESHOLD = 0.30;
export const INITIAL_POOL_SIZE = 3;
const MAX_REROLLS = 100;

// Make sure the pool has its starter questions seeded, and that
// every pool member has a question-state entry.
export function ensurePool(progress, quiz) {
  const order = quiz.questions.map((q) => q.id);
  const valid = new Set(order);

  // Drop pool entries whose questions no longer exist (file edit removed them).
  progress.pool = progress.pool.filter((id) => valid.has(id));

  // Seed initial pool from first INITIAL_POOL_SIZE valid questions if empty.
  if (progress.pool.length === 0) {
    progress.pool = order.slice(0, INITIAL_POOL_SIZE);
  } else if (progress.pool.length < INITIAL_POOL_SIZE) {
    // Top up if user added more questions to a tiny quiz.
    for (const id of order) {
      if (progress.pool.length >= INITIAL_POOL_SIZE) break;
      if (!progress.pool.includes(id)) progress.pool.push(id);
    }
  }

  // Make sure every pooled question has state.
  for (const id of progress.pool) {
    if (!progress.questions[id]) {
      progress.questions[id] = { p: 1, seen: 0, correct: 0, confusions: {} };
    }
  }
}

export function pickNextQuestion(progress, quiz, rand = Math.random) {
  const pool = progress.pool;
  if (pool.length === 0) return null;
  const single = pool.length === 1;

  let candidate = null;
  for (let attempt = 0; attempt < MAX_REROLLS; attempt++) {
    const qid = pool[Math.floor(rand() * pool.length)];
    if (!single && qid === progress.lastQuestionId) continue;

    const state = progress.questions[qid] || { p: 1 };
    const p = clamp(state.p, MIN_P, 1);
    candidate = qid;
    if (rand() < p) return qid;
  }
  return candidate; // fall-through after MAX_REROLLS
}

export function recordAnswer(progress, quiz, qid, wasCorrect, chosenWrongAnswer = null) {
  if (!progress.questions[qid]) {
    progress.questions[qid] = { p: 1, seen: 0, correct: 0, confusions: {} };
  }
  const state = progress.questions[qid];
  const before = state.p;

  state.seen += 1;
  progress.totalSeen += 1;
  if (wasCorrect) {
    state.correct += 1;
    progress.totalCorrect += 1;
    state.p = clamp(state.p * DECAY_RIGHT, MIN_P, MAX_P);
  } else {
    state.p = clamp(1 - (1 - state.p) * RECOVERY_WRONG, MIN_P, MAX_P);
    if (chosenWrongAnswer) {
      const key = String(chosenWrongAnswer);
      state.confusions[key] = (state.confusions[key] || 0) + 1;
    }
  }

  // Pool expansion: first time this question's p drops below THRESHOLD,
  // pull in the next un-pooled question in file order.
  if (
    before >= THRESHOLD &&
    state.p < THRESHOLD &&
    !progress.expandedFor.includes(qid)
  ) {
    progress.expandedFor.push(qid);
    expandPool(progress, quiz);
  }

  progress.lastQuestionId = qid;
}

function expandPool(progress, quiz) {
  for (const q of quiz.questions) {
    if (!progress.pool.includes(q.id)) {
      progress.pool.push(q.id);
      if (!progress.questions[q.id]) {
        progress.questions[q.id] = { p: 1, seen: 0, correct: 0, confusions: {} };
      }
      return;
    }
  }
}

export function progressSummary(progress, quiz) {
  const total = quiz.questions.length;
  const pool = progress.pool.length;
  let learned = 0;
  for (const q of quiz.questions) {
    const s = progress.questions[q.id];
    if (s && s.p < THRESHOLD) learned += 1;
  }
  return { total, pool, learned };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
