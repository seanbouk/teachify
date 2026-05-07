// Pick wrong-answer options for a multiple-choice question.
//
// Pool is every other answer in the whole quiz (deduped by text), not just the
// active learning pool — so distractors stay varied even early on.
//
// Bias: per-question, count how many times each wrong answer text was chosen
// for THIS question. Future picks weight those higher, so the app keeps
// presenting the choices the user has actually confused before.

export const CONFUSION_BIAS = 2.0; // weight = 1 + count * BIAS

export function pickDistractors(quiz, correctQid, progress, count = 2, rand = Math.random) {
  const correct = quiz.questions.find((q) => q.id === correctQid);
  if (!correct) return [];
  const correctText = correct.a;

  const seen = new Set([normalise(correctText)]);
  const candidates = [];
  for (const q of quiz.questions) {
    if (q.id === correctQid) continue;
    const key = normalise(q.a);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(q.a);
  }

  const confusions = (progress.questions[correctQid] && progress.questions[correctQid].confusions) || {};
  const weighted = candidates.map((text) => ({
    text,
    weight: 1 + (confusions[text] || 0) * CONFUSION_BIAS,
  }));

  const out = [];
  for (let i = 0; i < count && weighted.length > 0; i++) {
    const idx = pickWeightedIndex(weighted, rand);
    out.push(weighted[idx].text);
    weighted.splice(idx, 1);
  }
  return out;
}

function pickWeightedIndex(items, rand) {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function normalise(s) {
  return String(s ?? '').trim().toLowerCase();
}
