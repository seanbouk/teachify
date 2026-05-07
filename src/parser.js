// Quiz file parser.
//
// Format rule: the file is plain Markdown. The parser only cares about
// fenced ```q ... ``` blocks. Everything outside is ignored prose.
//
// Inside a q-block:
//   - First non-meta, non-blank line  -> question
//   - Second non-meta, non-blank line -> answer
//   - Lines starting with `#id:`, `#alt:`, `#note:` are metadata
//   - Lines starting with `//` are comments (ignored)
//
// Title:       first `# Heading` outside any q-block
// Description: first paragraph between the title and the first q-block
// Question id: explicit `#id:` if given, else a stable hash of the question text

const FENCE_OPEN = /^```\s*q\s*$/i;
const FENCE_CLOSE = /^```\s*$/;
const META_RE = /^#\s*(id|alt|note)\s*:\s*(.*)$/i;
const H1_RE = /^#\s+(.+?)\s*$/;

export function parseQuiz(raw, fallbackTitle = 'Untitled') {
  const text = String(raw ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  const blocks = [];
  const outside = [];
  let inBlock = false;
  let buffer = null;
  let blockStart = 0;
  let firstBlockIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      if (FENCE_OPEN.test(line)) {
        if (firstBlockIdx === -1) firstBlockIdx = i;
        inBlock = true;
        buffer = [];
        blockStart = i + 1;
        continue;
      }
      outside.push({ idx: i, text: line });
    } else {
      if (FENCE_CLOSE.test(line)) {
        blocks.push({ lines: buffer, start: blockStart });
        inBlock = false;
        buffer = null;
        continue;
      }
      buffer.push(line);
    }
  }
  if (inBlock && buffer) blocks.push({ lines: buffer, start: blockStart });

  let title = fallbackTitle;
  let titleIdx = -1;
  for (const { idx, text: t } of outside) {
    const m = t.match(H1_RE);
    if (m) { title = m[1].trim(); titleIdx = idx; break; }
  }

  const descBuf = [];
  for (const { idx, text: t } of outside) {
    if (idx <= titleIdx) continue;
    if (firstBlockIdx !== -1 && idx >= firstBlockIdx) break;
    descBuf.push(t);
  }
  let description = descBuf.join('\n').trim();
  description = description.split(/\n\s*\n/)[0].trim();

  const questions = [];
  const warnings = [];
  const seenIds = new Set();
  for (const block of blocks) {
    const parsed = parseBlock(block, warnings);
    if (!parsed) continue;
    if (seenIds.has(parsed.id)) {
      warnings.push(`Block at line ${block.start}: duplicate id "${parsed.id}" — skipped`);
      continue;
    }
    seenIds.add(parsed.id);
    questions.push(parsed);
  }

  return { title, description, questions, warnings };
}

function parseBlock(block, warnings) {
  let q = null;
  let a = null;
  const alts = [];
  let id = null;

  for (const rawLine of block.lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;

    const meta = line.match(META_RE);
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
