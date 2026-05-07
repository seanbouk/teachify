import { el, clear } from './dom.js';
import { loadProgress, saveProgress } from '../progress.js';
import {
  ensurePool,
  pickNextQuestion,
  recordAnswer,
  progressSummary,
} from '../selector.js';
import { pickDistractors } from '../distractors.js';

const TRANSITION_MS = 140;

export function renderPlay(root, { entry, onExit, onAnswer }) {
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
  const progressTrack = el('div', { class: 'play-progress-track' }, progressFill);

  // Milestone pegs — what you're aiming for. Pegs gain a "passed" class
  // once the learned-pct crosses their threshold.
  const MILESTONES = [
    { pct: 40, label: 'F' },
    { pct: 55, label: 'C' },
    { pct: 68, label: 'B' },
    { pct: 79, label: 'A' },
    { pct: 88, label: 'Super' },
    { pct: 95, label: 'Awesome' },
  ];
  const pegEls = MILESTONES.map((m) => {
    const peg = el('div', { class: 'peg' },
      el('span', { class: 'peg-label' }, m.label),
      el('span', { class: 'peg-tick' }),
    );
    peg.style.left = `${m.pct}%`;
    return peg;
  });

  const progressBar = el('div', {
    class: 'play-progress',
    role: 'progressbar',
    'aria-label': 'Quiz progress',
  }, progressTrack, ...pegEls);

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
  ));

  let currentQid = null;

  function refreshStats() {
    const s = progressSummary(progress, quiz);
    clear(stats);
    stats.appendChild(el('span', {}, `${s.learned} / ${s.total} learned`));
    if (s.pool < s.total) {
      stats.appendChild(el('span', { class: 'sep' }, '·'));
      stats.appendChild(el('span', {}, `${s.pool} in pool…`));
    }
    const pct = s.total > 0 ? (s.learned / s.total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(s.learned));
    progressBar.setAttribute('aria-valuemax', String(s.total));
    pegEls.forEach((peg, i) => {
      peg.classList.toggle('passed', pct >= MILESTONES[i].pct);
    });
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
          onpointerdown: (ev) => onPress(q, text, btn, ev),
          onclick: (ev) => ev.preventDefault(),
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

  function onPress(q, chosenText, chosenBtn, ev) {
    const state = optionsEl.dataset.state;
    if (state === 'locked') return;
    if (chosenBtn.disabled) return;

    const isCorrect = chosenText === q.a;

    if (state === 'awaiting' && !isCorrect) {
      // First wrong attempt — record it, highlight, wait for them to pick correct.
      optionsEl.dataset.state = 'wrong-shown';
      chosenBtn.classList.add('wrong');
      recordAnswer(progress, quiz, currentQid, false, chosenText);
      saveProgress(progress);
      refreshStats();
      if (onAnswer) onAnswer();
      for (const b of optionsEl.querySelectorAll('.option')) {
        if (b === chosenBtn) continue;
        if (b.textContent === q.a) {
          b.classList.add('correct', 'await-click');
        } else {
          b.disabled = true;
          b.classList.add('faded');
        }
      }
      return;
    }

    // Correct pick — first try, or after a wrong reveal.
    if (state === 'awaiting') {
      recordAnswer(progress, quiz, currentQid, true);
      saveProgress(progress);
      refreshStats();
      if (onAnswer) onAnswer();
    }
    optionsEl.dataset.state = 'locked';
    spawnWinParticle(chosenBtn);
    nextQuestion();
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
  }

  refreshStats();
  nextQuestion();
}

// Drop a translucent green ghost of the clicked button at its rect, floating
// upward and fading out. One particle per correct press — they stack freely
// when the user clicks rapidly.
function spawnWinParticle(sourceBtn) {
  const rect = sourceBtn.getBoundingClientRect();
  const cs = window.getComputedStyle(sourceBtn);
  const particle = el('div', { class: 'win-particle' }, sourceBtn.textContent);
  Object.assign(particle.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    fontFamily: cs.fontFamily,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    textAlign: cs.textAlign,
    borderRadius: cs.borderRadius,
  });
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 1100);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
