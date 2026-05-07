import { el, svg, svgEl, clear } from './dom.js';
import { loadProgress } from '../progress.js';
import { progressSummary } from '../selector.js';
import { makeReorderable } from '../reorder.js';

const ACCENT_VARS = [
  '--accent-1', '--accent-2', '--accent-3', '--accent-4',
  '--accent-5', '--accent-6', '--accent-7', '--accent-8',
];

// Named colours an author can put in a `meta` block as `color: cyan`.
// All resolve to one of the --accent-N CSS variables.
const NAMED_COLORS = {
  cyan: '--accent-1',
  pink: '--accent-2',
  mint: '--accent-3',
  green: '--accent-3',
  purple: '--accent-4',
  violet: '--accent-4',
  orange: '--accent-5',
  rose: '--accent-6',
  red: '--accent-6',
  yellow: '--accent-7',
  amber: '--accent-7',
  sky: '--accent-8',
  blue: '--accent-8',
};

function accentFor(entry) {
  const meta = entry.parsed && entry.parsed.meta;
  const wanted = meta && meta.color && String(meta.color).trim().toLowerCase();
  if (wanted) {
    if (NAMED_COLORS[wanted]) return `var(${NAMED_COLORS[wanted]})`;
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(wanted)) return wanted;
  }
  // Fallback: deterministic pick from accent palette by hashing the id.
  let h = 0;
  for (let i = 0; i < entry.id.length; i++) h = (h * 31 + entry.id.charCodeAt(i)) | 0;
  return `var(${ACCENT_VARS[Math.abs(h) % ACCENT_VARS.length]})`;
}

export function renderHome(root, { catalog, onPlay, onAdd, onManage, onReorder }) {
  clear(root);

  const gridEl = el('div', { class: 'grid' });
  for (const entry of catalog) {
    gridEl.appendChild(quizCard(entry, onPlay, onManage));
  }
  gridEl.appendChild(addCard(onAdd));

  const wrap = el('div', { class: 'home' },
    el('header', { class: 'home-header' },
      el('h1', { class: 'home-title' },
        // Manual kern pair — the system fallback font has no Te kern, so
        // we tug the e in slightly so the T overlaps it the way it should.
        el('span', { class: 'kern-t' }, 'T'),
        'eachify',
        el('span', { class: 'dot' }, '.'),
      ),
      el('p', { class: 'home-subtitle' },
        'Stuff worth learning by heart. 🧠💪🩷',
      ),
    ),
    gridEl,
  );

  root.appendChild(wrap);

  // Wire up drag-to-reorder for the cards (skip the add-card).
  if (onReorder) {
    const reorder = makeReorderable(gridEl, onReorder);
    for (const card of gridEl.querySelectorAll('.card[data-quiz-id]')) {
      reorder.attach(card);
    }
  }
}

function quizCard(entry, onPlay, onManage) {
  const progress = loadProgress(entry.id, entry.parsed.title);
  const summary = progressSummary(progress, entry.parsed);
  const pct = summary.total > 0 ? Math.round((summary.learned / summary.total) * 100) : 0;

  const onActivate = (ev) => {
    if (ev.target.closest('.manage-btn')) return;
    if (ev.target.closest('.drag-handle')) return;
    onPlay(entry);
  };

  const card = el('article', {
    class: 'card',
    tabindex: '0',
    role: 'button',
    'data-quiz-id': entry.id,
    'aria-label': `Play ${entry.parsed.title}`,
    onclick: onActivate,
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  });
  card.style.setProperty('--card-accent', accentFor(entry));

  const header = el('div', { class: 'card-header' },
    el('button', {
      class: 'drag-handle',
      type: 'button',
      'aria-label': `Reorder ${entry.parsed.title}`,
      title: 'Drag to reorder',
    }, gripIcon()),
    el('h2', { class: 'card-title' }, entry.parsed.title),
    el('button', {
      class: 'manage-btn',
      type: 'button',
      'aria-label': `Manage ${entry.parsed.title}`,
      onclick: (ev) => {
        ev.stopPropagation();
        onManage(entry);
      },
    }, kebabIcon()),
  );

  const desc = el('p', { class: 'card-desc' },
    entry.parsed.description || `${entry.parsed.questions.length} questions.`,
  );

  const meta = el('div', { class: 'card-meta' },
    el('span', { class: 'card-progress' }, `${summary.learned} / ${summary.total} learned`),
    summary.pool < summary.total
      ? el('span', { class: 'card-pool' }, `${summary.pool} in pool…`)
      : null,
    entry.source === 'user'
      ? el('span', { class: 'badge' }, 'Yours')
      : null,
  );

  const bar = el('div', { class: 'progress-bar', 'aria-hidden': 'true' },
    el('div', { class: 'progress-fill', style: { width: `${pct}%` } }),
  );

  card.appendChild(header);
  card.appendChild(desc);
  card.appendChild(meta);
  card.appendChild(bar);
  return card;
}

function addCard(onAdd) {
  return el('button', {
    class: 'card card-add',
    type: 'button',
    onclick: onAdd,
  },
    el('div', { class: 'card-add-plus' }, '+'),
    el('div', { class: 'card-add-label' }, 'Bring your own'),
    el('div', { class: 'card-add-hint' }, 'Drop in a .txt — yours or one someone sent you.'),
  );
}

function gripIcon() {
  return svg('0 0 16 16',
    svgEl('circle', { cx: '5.5', cy: '4', r: '1.2', fill: 'currentColor' }),
    svgEl('circle', { cx: '10.5', cy: '4', r: '1.2', fill: 'currentColor' }),
    svgEl('circle', { cx: '5.5', cy: '8', r: '1.2', fill: 'currentColor' }),
    svgEl('circle', { cx: '10.5', cy: '8', r: '1.2', fill: 'currentColor' }),
    svgEl('circle', { cx: '5.5', cy: '12', r: '1.2', fill: 'currentColor' }),
    svgEl('circle', { cx: '10.5', cy: '12', r: '1.2', fill: 'currentColor' }),
  );
}

function kebabIcon() {
  return svg('0 0 20 20',
    svgEl('circle', { cx: '10', cy: '4', r: '1.6', fill: 'currentColor' }),
    svgEl('circle', { cx: '10', cy: '10', r: '1.6', fill: 'currentColor' }),
    svgEl('circle', { cx: '10', cy: '16', r: '1.6', fill: 'currentColor' }),
  );
}
