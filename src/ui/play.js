import { el, clear, svg, svgEl } from './dom.js';
import { loadProgress, saveProgress } from '../progress.js';
import {
  ensurePool,
  pickNextQuestion,
  recordAnswer,
  progressSummary,
} from '../selector.js';
import { pickDistractors } from '../distractors.js';

const TRANSITION_MS = 140;

export function renderPlay(root, { entry, onExit }) {
  clear(root);
  const quiz = entry.parsed;
  const progress = loadProgress(entry.id, quiz.title);
  ensurePool(progress, quiz);
  saveProgress(progress);

  if (quiz.questions.length < 3) {
    root.appendChild(el('div', { class: 'play-empty' },
      el('p', {}, 'A quiz needs at least 3 questions to play (so we can show 3 options).'),
      el('button', { class: 'btn btn-primary', onclick: onExit }, 'Back'),
    ));
    return;
  }

  const stats = el('div', { class: 'play-stats' });
  const questionEl = el('div', { class: 'play-question' });
  const optionsEl = el('div', { class: 'play-options' });
  const progressFill = el('div', { class: 'play-progress-fill' });
  const progressBar = el('div', {
    class: 'play-progress',
    role: 'progressbar',
    'aria-label': 'Quiz progress',
  }, progressFill);
  const toastLayer = el('div', { class: 'toast-layer', 'aria-hidden': 'true' });

  const header = el('header', { class: 'play-header' },
    el('button', {
      class: 'btn-ghost',
      type: 'button',
      onclick: onExit,
      'aria-label': 'Back to quizzes',
    }, '← Back'),
    el('div', { class: 'play-title-block' },
      el('div', { class: 'play-title' }, quiz.title),
      stats,
    ),
  );

  root.appendChild(el('div', { class: 'play' },
    header,
    progressBar,
    el('main', { class: 'play-main' }, questionEl, optionsEl),
    toastLayer,
  ));

  let currentQid = null;

  function refreshStats() {
    const s = progressSummary(progress, quiz);
    clear(stats);
    stats.appendChild(el('span', {}, `${s.learned} / ${s.total} learned`));
    if (s.pool < s.total) {
      stats.appendChild(el('span', { class: 'sep' }, '·'));
      stats.appendChild(el('span', {}, `${s.pool} in pool`));
    }
    const pct = s.total > 0 ? (s.learned / s.total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(s.learned));
    progressBar.setAttribute('aria-valuemax', String(s.total));
  }

  function nextQuestion() {
    const qid = pickNextQuestion(progress, quiz);
    if (!qid) return;
    currentQid = qid;
    const q = quiz.questions.find((x) => x.id === qid);
    const distractors = pickDistractors(quiz, qid, progress, 2);
    const options = shuffle([q.a, ...distractors]);
    renderRound(q, options);
  }

  function renderRound(q, options) {
    questionEl.classList.add('leaving');
    optionsEl.classList.add('leaving');

    setTimeout(() => {
      questionEl.classList.remove('leaving');
      optionsEl.classList.remove('leaving');
      questionEl.textContent = q.q;
      clear(optionsEl);
      optionsEl.dataset.state = 'awaiting';

      for (const text of options) {
        const btn = el('button', {
          class: 'option',
          type: 'button',
          onclick: () => onPick(q, text, btn),
        }, text);
        optionsEl.appendChild(btn);
      }

      requestAnimationFrame(() => {
        questionEl.classList.add('entering');
        optionsEl.classList.add('entering');
        requestAnimationFrame(() => {
          questionEl.classList.remove('entering');
          optionsEl.classList.remove('entering');
        });
      });
    }, TRANSITION_MS);
  }

  function onPick(q, chosenText, chosenBtn) {
    const state = optionsEl.dataset.state;
    if (state === 'locked') return;

    const isCorrect = chosenText === q.a;

    if (isCorrect) {
      if (state === 'wrong-shown') {
        // Already recorded the wrong answer — just advance immediately.
        optionsEl.dataset.state = 'locked';
        chosenBtn.classList.add('chosen');
        nextQuestion();
        return;
      }
      optionsEl.dataset.state = 'locked';
      chosenBtn.classList.add('correct');
      recordAnswer(progress, quiz, currentQid, true);
      saveProgress(progress);
      refreshStats();
      flashToast(toastLayer, 'correct');
      nextQuestion();
      return;
    }

    // Wrong pick.
    if (state !== 'awaiting') return;
    optionsEl.dataset.state = 'wrong-shown';
    chosenBtn.classList.add('wrong');
    recordAnswer(progress, quiz, currentQid, false, chosenText);
    saveProgress(progress);
    refreshStats();
    flashToast(toastLayer, 'wrong');

    for (const b of optionsEl.querySelectorAll('.option')) {
      if (b === chosenBtn) continue;
      if (b.textContent === q.a) {
        b.classList.add('correct', 'await-click');
      } else {
        b.disabled = true;
        b.classList.add('faded');
      }
    }
  }

  refreshStats();
  nextQuestion();
}

function flashToast(layer, kind) {
  const toast = el('div', { class: `toast toast-${kind}` }, kind === 'correct' ? checkIcon() : crossIcon());
  layer.appendChild(toast);
  // Remove after the animation completes so the layer doesn't grow.
  setTimeout(() => toast.remove(), 700);
}

function checkIcon() {
  return svg('0 0 24 24',
    svgEl('path', {
      d: 'M5 12.5l4.5 4.5L19 7.5',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '3',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
}

function crossIcon() {
  return svg('0 0 24 24',
    svgEl('path', {
      d: 'M7 7l10 10M17 7L7 17',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '3',
      'stroke-linecap': 'round',
    }),
  );
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
