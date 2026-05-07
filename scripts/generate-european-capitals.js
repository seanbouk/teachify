// One-shot generator for public/quizzes/european-capitals.txt.
// Run: node scripts/generate-european-capitals.js
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'quizzes', 'european-capitals.txt');

// [country name, flag emoji, capital, stable id, ...accepted alts]
const countries = [
  ['France', '🇫🇷', 'Paris', 'france'],
  ['Spain', '🇪🇸', 'Madrid', 'spain'],
  ['Italy', '🇮🇹', 'Rome', 'italy'],
  ['Germany', '🇩🇪', 'Berlin', 'germany'],
  ['Portugal', '🇵🇹', 'Lisbon', 'portugal'],
  ['United Kingdom', '🇬🇧', 'London', 'uk'],
  ['Ireland', '🇮🇪', 'Dublin', 'ireland'],
  ['Netherlands', '🇳🇱', 'Amsterdam', 'netherlands'],
  ['Belgium', '🇧🇪', 'Brussels', 'belgium'],
  ['Luxembourg', '🇱🇺', 'Luxembourg', 'luxembourg'],
  ['Switzerland', '🇨🇭', 'Bern', 'switzerland', 'Berne'],
  ['Austria', '🇦🇹', 'Vienna', 'austria'],
  ['Denmark', '🇩🇰', 'Copenhagen', 'denmark'],
  ['Norway', '🇳🇴', 'Oslo', 'norway'],
  ['Sweden', '🇸🇪', 'Stockholm', 'sweden'],
  ['Finland', '🇫🇮', 'Helsinki', 'finland'],
  ['Iceland', '🇮🇸', 'Reykjavik', 'iceland', 'Reykjavík'],
  ['Poland', '🇵🇱', 'Warsaw', 'poland'],
  ['Czech Republic', '🇨🇿', 'Prague', 'czech-republic'],
  ['Slovakia', '🇸🇰', 'Bratislava', 'slovakia'],
  ['Hungary', '🇭🇺', 'Budapest', 'hungary'],
  ['Romania', '🇷🇴', 'Bucharest', 'romania'],
  ['Bulgaria', '🇧🇬', 'Sofia', 'bulgaria'],
  ['Greece', '🇬🇷', 'Athens', 'greece'],
  ['Turkey', '🇹🇷', 'Ankara', 'turkey'],
  ['Albania', '🇦🇱', 'Tirana', 'albania'],
  ['North Macedonia', '🇲🇰', 'Skopje', 'north-macedonia'],
  ['Serbia', '🇷🇸', 'Belgrade', 'serbia'],
  ['Croatia', '🇭🇷', 'Zagreb', 'croatia'],
  ['Slovenia', '🇸🇮', 'Ljubljana', 'slovenia'],
  ['Bosnia and Herzegovina', '🇧🇦', 'Sarajevo', 'bosnia'],
  ['Montenegro', '🇲🇪', 'Podgorica', 'montenegro'],
  ['Kosovo', '🇽🇰', 'Pristina', 'kosovo', 'Prishtina'],
  ['Cyprus', '🇨🇾', 'Nicosia', 'cyprus'],
  ['Malta', '🇲🇹', 'Valletta', 'malta'],
  ['Estonia', '🇪🇪', 'Tallinn', 'estonia'],
  ['Latvia', '🇱🇻', 'Riga', 'latvia'],
  ['Lithuania', '🇱🇹', 'Vilnius', 'lithuania'],
  ['Belarus', '🇧🇾', 'Minsk', 'belarus'],
  ['Ukraine', '🇺🇦', 'Kyiv', 'ukraine', 'Kiev'],
  ['Moldova', '🇲🇩', 'Chisinau', 'moldova', 'Chișinău'],
  ['Russia', '🇷🇺', 'Moscow', 'russia'],
  ['Andorra', '🇦🇩', 'Andorra la Vella', 'andorra'],
  ['Monaco', '🇲🇨', 'Monaco', 'monaco'],
  ['San Marino', '🇸🇲', 'San Marino', 'san-marino'],
  ['Liechtenstein', '🇱🇮', 'Vaduz', 'liechtenstein'],
  ['Vatican City', '🇻🇦', 'Vatican City', 'vatican'],
];

const header = `\`\`\`meta
title: Capital Cities of Europe
description: A practice quiz on European capitals. ${countries.length} countries.
color: cyan
author: Teachify
\`\`\`

# Capital Cities of Europe

A practice quiz on European capitals. ${countries.length} countries.

The \`meta\` block above tells Teachify the title, blurb, and accent
colour. Each question lives in a fenced \`\`\`q ... \`\`\` block — first
line is the question, second is the answer. Anything outside those
blocks (including this paragraph) is ignored by the app, so you can
add notes, sources, or jokes without breaking anything.

Optional \`#id: short-label\` lines keep your progress when you edit a
typo. \`#alt: ...\` lines accept alternative spellings.

`;

let body = '';
for (const [name, flag, capital, id, ...alts] of countries) {
  body += '```q\n';
  body += `${name} ${flag}?\n`;
  body += `${capital}\n`;
  body += `#id: ${id}\n`;
  for (const alt of alts) body += `#alt: ${alt}\n`;
  body += '```\n\n';
}

writeFileSync(out, header + body);
console.log(`wrote ${out} — ${countries.length} questions`);
