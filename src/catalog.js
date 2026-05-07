// Quiz catalog: built-in starter quizzes (under /quizzes/) plus
// user-added quizzes saved as raw .txt content in localStorage.

import { parseQuiz, slugify } from './parser.js';

const USER_INDEX_KEY = 'teachify:user-quizzes';
const USER_QUIZ_KEY = (id) => `teachify:quiz:${id}`;

const BUILTIN_BASE = `${import.meta.env.BASE_URL}quizzes/`;

let builtInPromise = null;

export function loadCatalog() {
  if (!builtInPromise) builtInPromise = loadBuiltIn();
  return builtInPromise.then((builtIn) => {
    const user = loadUserQuizzes();
    const merged = [...builtIn];
    const seen = new Set(builtIn.map((q) => q.id));
    for (const u of user) {
      if (seen.has(u.id)) continue; // built-ins win
      merged.push(u);
      seen.add(u.id);
    }
    return merged;
  });
}

async function loadBuiltIn() {
  try {
    const res = await fetch(`${BUILTIN_BASE}manifest.json`);
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const manifest = await res.json();
    const files = Array.isArray(manifest.quizzes) ? manifest.quizzes : [];
    const out = [];
    for (const file of files) {
      try {
        const r = await fetch(`${BUILTIN_BASE}${file}`);
        if (!r.ok) continue;
        const raw = await r.text();
        const fallback = file.replace(/\.txt$/i, '').replace(/-/g, ' ');
        const parsed = parseQuiz(raw, fallback);
        out.push({
          id: slugify(parsed.title || fallback),
          source: 'builtin',
          file,
          raw,
          parsed,
        });
      } catch (err) {
        console.warn(`catalog: failed to load built-in ${file}`, err);
      }
    }
    return out;
  } catch (err) {
    console.warn('catalog: failed to load built-in manifest', err);
    return [];
  }
}

function loadUserQuizzes() {
  let ids = [];
  try {
    const raw = localStorage.getItem(USER_INDEX_KEY);
    ids = raw ? JSON.parse(raw) : [];
  } catch {
    ids = [];
  }
  if (!Array.isArray(ids)) ids = [];

  const out = [];
  for (const id of ids) {
    try {
      const raw = localStorage.getItem(USER_QUIZ_KEY(id));
      if (!raw) continue;
      const parsed = parseQuiz(raw, id);
      out.push({
        id,
        source: 'user',
        raw,
        parsed,
      });
    } catch (err) {
      console.warn(`catalog: failed to load user quiz ${id}`, err);
    }
  }
  return out;
}

// Add a user-uploaded quiz. Returns the new entry on success.
// If a built-in with the same id exists, throws. If a user quiz with the
// same id exists and `overwrite` is false, throws { code: 'EXISTS' }.
export async function addUserQuiz(rawText, { overwrite = false } = {}) {
  const parsed = parseQuiz(rawText, 'Untitled quiz');
  if (parsed.questions.length < 3) {
    throw new Error(`Need at least 3 questions to play (found ${parsed.questions.length}).`);
  }
  const id = slugify(parsed.title);

  const builtIn = await (builtInPromise || (builtInPromise = loadBuiltIn()));
  if (builtIn.some((q) => q.id === id)) {
    throw new Error(`A built-in quiz called "${parsed.title}" already exists. Rename your quiz to add it.`);
  }

  const existing = loadUserQuizzes().find((q) => q.id === id);
  if (existing && !overwrite) {
    const err = new Error(`A quiz called "${parsed.title}" already exists.`);
    err.code = 'EXISTS';
    err.id = id;
    throw err;
  }

  // Save raw text + index entry.
  localStorage.setItem(USER_QUIZ_KEY(id), rawText);
  const ids = readUserIndex();
  if (!ids.includes(id)) {
    ids.push(id);
    writeUserIndex(ids);
  }
  return { id, source: 'user', raw: rawText, parsed };
}

export function removeUserQuiz(id) {
  const ids = readUserIndex().filter((x) => x !== id);
  writeUserIndex(ids);
  localStorage.removeItem(USER_QUIZ_KEY(id));
  // We deliberately leave progress intact — if the same quiz is re-added,
  // progress lights back up.
}

function readUserIndex() {
  try {
    const raw = localStorage.getItem(USER_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeUserIndex(ids) {
  localStorage.setItem(USER_INDEX_KEY, JSON.stringify(ids));
}

export function downloadQuizText(entry) {
  const blob = new Blob([entry.raw], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entry.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
