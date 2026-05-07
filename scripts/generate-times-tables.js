// One-shot generator for public/quizzes/times-tables.txt.
// Run: node scripts/generate-times-tables.js
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'quizzes', 'times-tables.txt');

const header = `\`\`\`meta
title: Times Tables (1–12)
description: The full multiplication table from 1×1 up to 12×12. 144 questions.
color: orange
author: Teachify
\`\`\`

# Times Tables (1–12)

The full multiplication table from 1×1 up to 12×12. 144 questions.

The \`meta\` block above tells Teachify the title, blurb, and accent
colour. Each question lives inside a fenced \`\`\`q ... \`\`\` block: first
line is the question, second is the answer. Anything outside those
blocks — including this paragraph — is ignored by the app, so you
can edit the prose freely. Optional \`#id:\` lines keep your progress
when you fix a typo. \`#alt:\` lines accept alternative correct answers.

`;

let body = '';
for (let a = 1; a <= 12; a++) {
  for (let b = 1; b <= 12; b++) {
    body += '```q\n';
    body += `${a} × ${b}\n`;
    body += `${a * b}\n`;
    body += `#id: t${a}x${b}\n`;
    body += '```\n\n';
  }
}

writeFileSync(out, header + body);
console.log(`wrote ${out}`);
