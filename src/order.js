// User-controlled order of quizzes on the home screen.
// Stored as an array of quiz IDs in localStorage. New quizzes that aren't
// yet in the order go to the end so the saved order is non-destructive.

const ORDER_KEY = 'teachify:quiz-order';

export function loadOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveOrder(ids) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

// Returns catalog re-sorted by the saved order. Quizzes not in the saved
// order keep their incoming order at the end.
export function applyOrder(catalog) {
  const order = loadOrder();
  if (order.length === 0) return catalog.slice();
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const result = [];
  const seen = new Set();
  for (const id of order) {
    if (byId.has(id) && !seen.has(id)) {
      result.push(byId.get(id));
      seen.add(id);
    }
  }
  for (const e of catalog) {
    if (!seen.has(e.id)) {
      result.push(e);
      seen.add(e.id);
    }
  }
  return result;
}

// Move a quiz to the front of the saved order. Used to auto-pin a quiz
// the moment the user answers a question in it.
export function promoteQuiz(id, knownIds = []) {
  const current = loadOrder();
  // Seed from knownIds if empty so the first promotion preserves the
  // existing visual sequence rather than collapsing it to [id].
  let base = current.length === 0 && knownIds.length > 0 ? knownIds.slice() : current;
  const filtered = base.filter((x) => x !== id);
  filtered.unshift(id);
  saveOrder(filtered);
}
