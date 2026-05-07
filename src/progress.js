// Per-quiz progress, stored in localStorage.
//
// Shape:
// {
//   version: 1,
//   quizId, quizTitle,
//   questions: { [qid]: { p, seen, correct, confusions: { [answerText]: count } } },
//   pool: [qid, ...],          // array of qids currently in the active pool
//   expandedFor: [qid, ...],   // qids that have already triggered a pool expansion
//   totalSeen, totalCorrect,
//   lastQuestionId,             // last shown qid, used to avoid back-to-back repeats
//   updatedAt,
// }

const PROGRESS_KEY = (quizId) => `teachify:progress:${quizId}`;
const SESSION_DL_KEY = (quizId) => `teachify:downloaded:${quizId}`;

export function defaultProgress(quizId, quizTitle) {
  return {
    version: 1,
    quizId,
    quizTitle,
    questions: {},
    pool: [],
    expandedFor: [],
    totalSeen: 0,
    totalCorrect: 0,
    lastQuestionId: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadProgress(quizId, quizTitle) {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(quizId));
    if (!raw) return defaultProgress(quizId, quizTitle);
    const parsed = JSON.parse(raw);
    return migrateProgress(parsed, quizId, quizTitle);
  } catch (err) {
    console.warn(`progress: failed to load ${quizId}, using fresh state`, err);
    return defaultProgress(quizId, quizTitle);
  }
}

export function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(PROGRESS_KEY(progress.quizId), JSON.stringify(progress));
  } catch (err) {
    console.warn('progress: save failed (storage full?)', err);
  }
}

export function resetProgress(quizId, quizTitle) {
  const fresh = defaultProgress(quizId, quizTitle);
  saveProgress(fresh);
  return fresh;
}

export function downloadProgress(progress) {
  const json = JSON.stringify(progress, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (progress.quizId || 'quiz').replace(/[^a-z0-9-]+/gi, '-');
  a.href = url;
  a.download = `${safe}.progress.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  markDownloaded(progress.quizId);
}

export async function uploadProgress(quizId, file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That file doesn’t look like a progress file.');
  }
  if (parsed.quizId && parsed.quizId !== quizId) {
    throw new Error(
      `That progress file is for "${parsed.quizId}", not this quiz.`
    );
  }
  const migrated = migrateProgress(parsed, quizId, parsed.quizTitle);
  saveProgress(migrated);
  return migrated;
}

export function hasDownloadedThisSession(quizId) {
  try {
    return sessionStorage.getItem(SESSION_DL_KEY(quizId)) === '1';
  } catch {
    return false;
  }
}

export function markDownloaded(quizId) {
  try {
    sessionStorage.setItem(SESSION_DL_KEY(quizId), '1');
  } catch {
    /* ignore */
  }
}

// Bring older/foreign shapes up to current.
function migrateProgress(p, quizId, quizTitle) {
  const base = defaultProgress(quizId, quizTitle);
  const out = { ...base, ...p };
  out.version = 1;
  out.quizId = quizId;
  out.quizTitle = quizTitle || p.quizTitle || base.quizTitle;
  out.questions = (p.questions && typeof p.questions === 'object') ? p.questions : {};
  // Sanitise per-question state.
  for (const [qid, q] of Object.entries(out.questions)) {
    if (!q || typeof q !== 'object') {
      delete out.questions[qid];
      continue;
    }
    q.p = clamp(typeof q.p === 'number' ? q.p : 1, 0.01, 1);
    q.seen = typeof q.seen === 'number' ? q.seen : 0;
    q.correct = typeof q.correct === 'number' ? q.correct : 0;
    q.confusions = (q.confusions && typeof q.confusions === 'object') ? q.confusions : {};
  }
  out.pool = Array.isArray(p.pool) ? p.pool.filter((x) => typeof x === 'string') : [];
  out.expandedFor = Array.isArray(p.expandedFor)
    ? p.expandedFor.filter((x) => typeof x === 'string')
    : [];
  out.totalSeen = typeof p.totalSeen === 'number' ? p.totalSeen : 0;
  out.totalCorrect = typeof p.totalCorrect === 'number' ? p.totalCorrect : 0;
  out.lastQuestionId = typeof p.lastQuestionId === 'string' ? p.lastQuestionId : null;
  return out;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
