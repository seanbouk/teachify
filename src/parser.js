// Quiz file parser.
//
// Format rule: the file is plain Markdown. The parser only cares about
// fenced ```q ... ``` and ```meta ... ``` blocks. Everything outside is
// ignored prose. Other fenced blocks (e.g. ```js, ```python) are treated
// as opaque and skipped over.
//
// Inside a `q` block:
//   - First non-meta, non-blank line  -> question
//   - Second non-meta, non-blank line -> answer
//   - Lines starting with `#id:`, `#alt:`, `#note:` are metadata
//   - Lines starting with `//` are comments (ignored)
//
// Inside a `meta` block (one or more anywhere in the file):
//   - `key: value` lines
//   - Recognised keys: title, description (alias: desc), author, color
//   - Anything else stored on the meta object (forward-compatible)
//
// Title fallback:       first `# Heading` outside any block
// Description fallback: first paragraph between the title and the first q-block
// Question id fallback: stable hash of question text

const FENCE_OPEN = /^```\s*([a-zA-Z][a-zA-Z0-9-]*)\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const Q_META_RE = /^#\s*(id|alt|note)\s*:\s*(.*)$/i;
const META_LINE_RE = /^#?\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*(.*)$/;
const H1_RE = /^#\s+(.+?)\s*$/;

export function parseQuiz(raw, fallbackTitle = 'Untitled') {
  const text = String(raw ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  const qBlocks = [];
  const metaBlocks = [];
  const outside = [];
  let inBlock = false;
  let currentTag = null;
  let buffer = null;
  let blockStart = 0;
  let firstQBlockIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const m = line.match(FENCE_OPEN);
      if (m) {
        inBlock = true;
        currentTag = m[1].toLowerCase();
        buffer = [];
        blockStart = i + 1;
        if (currentTag === 'q' && firstQBlockIdx === -1) firstQBlockIdx = i;
        continue;
      }
      outside.push({ idx: i, text: line });
    } else {
      if (FENCE_CLOSE.test(line)) {
        if (currentTag === 'q') qBlocks.push({ lines: buffer, start: blockStart });
        else if (currentTag === 'meta') metaBlocks.push({ lines: buffer, start: blockStart });
        // unknown tags are dropped silently — file stays valid
        inBlock = false;
        currentTag = null;
        buffer = null;
        continue;
      }
      buffer.push(line);
    }
  }
  // Unclosed block — keep what we have so far.
  if (inBlock && buffer) {
    if (currentTag === 'q') qBlocks.push({ lines: buffer, start: blockStart });
    else if (currentTag === 'meta') metaBlocks.push({ lines: buffer, start: blockStart });
  }

  // Merge all meta blocks (later wins).
  const meta = {};
  for (const b of metaBlocks) Object.assign(meta, parseMetaBlock(b));

  // Implicit title/description from prose (fallback when meta omits them).
  let implicitTitle = null;
  let titleIdx = -1;
  for (const { idx, text: t } of outside) {
    const m = t.match(H1_RE);
    if (m) { implicitTitle = m[1].trim(); titleIdx = idx; break; }
  }
  const descBuf = [];
  for (const { idx, text: t } of outside) {
    if (idx <= titleIdx) continue;
    if (firstQBlockIdx !== -1 && idx >= firstQBlockIdx) break;
    descBuf.push(t);
  }
  let implicitDescription = descBuf.join('\n').trim();
  implicitDescription = implicitDescription.split(/\n\s*\n/)[0].trim();

  const title = (meta.title || implicitTitle || fallbackTitle).trim();
  const description = (meta.description || meta.desc || implicitDescription || '').trim();

  // Parse q-blocks into questions.
  const questions = [];
  const warnings = [];
  const seenIds = new Set();
  for (const block of qBlocks) {
    const parsed = parseQBlock(block, warnings);
    if (!parsed) continue;
    if (seenIds.has(parsed.id)) {
      warnings.push(`Block at line ${block.start}: duplicate id "${parsed.id}" — skipped`);
      continue;
    }
    seenIds.add(parsed.id);
    questions.push(parsed);
  }

  return { title, description, meta, questions, warnings };
}

function parseMetaBlock(block) {
  const out = {};
  for (const rawLine of block.lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;
    const m = line.match(META_LINE_RE);
    if (!m) continue;
    out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

function parseQBlock(block, warnings) {
  let q = null;
  let a = null;
  const alts = [];
  let id = null;

  for (const rawLine of block.lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;

    const meta = line.match(Q_META_RE);
    if (meta) {
      const key = meta[1].toLowerCase();
      const val = meta[2].trim();
      if (!val) continue;
      if (key === 'id' && id === null) id = val;
      else if (key === 'alt') alts.push(val);
      continue;
    }

    if (q === null) q = line;
    else if (a === null) a = line;
  }

  if (q === null || a === null) {
    warnings.push(`Block at line ${block.start}: missing question or answer — skipped`);
    return null;
  }

  if (!id) id = hashId(q);
  return { id, q, a, alts };
}

function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return 'h' + (h >>> 0).toString(36);
}

export function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'quiz';
}
