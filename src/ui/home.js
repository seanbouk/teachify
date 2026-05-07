import { el, svg, svgEl, clear } from './dom.js';
import { loadProgress } from '../progress.js';
import { progressSummary, THRESHOLD } from '../selector.js';

export function renderHome(root, { catalog, onPlay, onAdd, onManage }) {
  clear(root);

  const wrap = el('div', { class: 'home' },
    el('header', { class: 'home-header' },
      el('h1', { class: 'home-title' }, 'Teachify'),
      el('p', { class: 'home-subtitle' },
        'A quiet place to learn things by heart. Pick a quiz, or add one of your own.',
      ),
    ),
    grid(catalog, onPlay, onManage, onAdd),
  );

  root.appendChild(wrap);
}

function grid(catalog, onPlay, onManage, onAdd) {
  const g = el('div', { class: 'grid' });
  for (const entry of catalog) {
    g.appendChild(quizCard(entry, onPlay, onManage));
  }
  g.appendChild(addCard(onAdd));
  return g;
}

function quizCard(entry, onPlay, onManage) {
  const progress = loadProgress(entry.id, entry.parsed.title);
  const summary = progressSummary(progress, entry.parsed);
  const pct = summary.total > 0 ? Math.round((summary.learned / summary.total) * 100) : 0;

  const onActivate = (ev) => {
    if (ev.target.closest('.manage-btn')) return;
    onPlay(entry);
  };

  const card = el('article', {
    class: 'card',
    tabindex: '0',
    role: 'button',
    'aria-label': `Play ${entry.parsed.title}`,
    onclick: onActivate,
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  });

  const header = el('div', { class: 'card-header' },
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
      ? el('span', { class: 'card-pool' }, `${summary.pool} in pool`)
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
    el('div', { class: 'card-add-label' }, 'Add a quiz'),
    el('div', { class: 'card-add-hint' }, 'Upload a .txt file you wrote or were sent.'),
  );
}

function kebabIcon() {
  return svg('0 0 20 20',
    svgEl('circle', { cx: '10', cy: '4', r: '1.6', fill: 'currentColor' }),
    svgEl('circle', { cx: '10', cy: '10', r: '1.6', fill: 'currentColor' }),
    svgEl('circle', { cx: '10', cy: '16', r: '1.6', fill: 'currentColor' }),
  );
}
