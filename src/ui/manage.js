import { el, clear } from './dom.js';
import {
  loadProgress,
  downloadProgress,
  uploadProgress,
  resetProgress,
  hasDownloadedThisSession,
} from '../progress.js';
import { downloadQuizText, removeUserQuiz } from '../catalog.js';

export function openManagePanel({ entry, onClose, onChange }) {
  const overlay = el('div', { class: 'overlay' });
  const panel = el('div', {
    class: 'panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': `Manage ${entry.parsed.title}`,
  });

  const status = el('p', { class: 'panel-status', role: 'status', 'aria-live': 'polite' });
  function setStatus(text, variant = '') {
    status.textContent = text;
    status.className = 'panel-status' + (variant ? ' ' + variant : '');
  }

  const close = () => {
    overlay.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 160);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Header
  panel.appendChild(el('header', { class: 'panel-header' },
    el('div', { class: 'panel-title-block' },
      el('h2', { class: 'panel-title' }, entry.parsed.title),
      el('p', { class: 'panel-sub' },
        entry.source === 'user' ? 'Your quiz' : 'Built-in quiz',
        ` · ${entry.parsed.questions.length} questions`,
      ),
    ),
    el('button', {
      class: 'btn-ghost btn-close',
      type: 'button',
      'aria-label': 'Close',
      onclick: close,
    }, '×'),
  ));

  // Sections
  panel.appendChild(section(
    'Share quiz',
    'Download the .txt file and send it to whoever you like. They can open it as their own quiz.',
    el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        downloadQuizText(entry);
        setStatus('Quiz file downloaded.', 'good');
      },
    }, 'Download quiz file'),
  ));

  // Your progress section
  const uploadBtn = el('button', {
    class: 'btn',
    type: 'button',
    disabled: !hasDownloadedThisSession(entry.id),
    title: hasDownloadedThisSession(entry.id)
      ? ''
      : 'Download your progress first to enable upload.',
  }, 'Upload progress');

  const fileInput = el('input', {
    type: 'file',
    accept: '.json,application/json',
    style: { display: 'none' },
  });
  fileInput.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    try {
      await uploadProgress(entry.id, f);
      setStatus('Progress replaced from file.', 'good');
      if (onChange) onChange();
    } catch (err) {
      setStatus(err.message || 'Upload failed.', 'error');
    } finally {
      ev.target.value = '';
    }
  });

  uploadBtn.addEventListener('click', () => {
    if (uploadBtn.disabled) return;
    fileInput.click();
  });

  const downloadProgressBtn = el('button', {
    class: 'btn',
    type: 'button',
    onclick: () => {
      const progress = loadProgress(entry.id, entry.parsed.title);
      downloadProgress(progress);
      uploadBtn.disabled = false;
      uploadBtn.removeAttribute('title');
      setStatus('Progress downloaded. Upload is now enabled this session.', 'good');
    },
  }, 'Download progress');

  panel.appendChild(section(
    'Your progress',
    'Back up your saved progress, or replace it from a file you downloaded earlier. Upload is locked until you download first this session.',
    el('div', { class: 'btn-row' },
      downloadProgressBtn,
      uploadBtn,
      fileInput,
    ),
  ));

  panel.appendChild(section(
    'Reset',
    'Wipe your progress for this quiz. The quiz itself stays.',
    el('button', {
      class: 'btn btn-danger',
      type: 'button',
      onclick: () => {
        const ok = window.confirm(
          `Reset all progress for "${entry.parsed.title}"? This can't be undone.`,
        );
        if (!ok) return;
        resetProgress(entry.id, entry.parsed.title);
        setStatus('Progress reset.', 'good');
        if (onChange) onChange();
      },
    }, 'Reset progress'),
  ));

  if (entry.source === 'user') {
    panel.appendChild(section(
      'Delete quiz',
      'Remove this quiz from your list. Your progress for it stays — re-add the file later and it lights back up.',
      el('button', {
        class: 'btn btn-danger',
        type: 'button',
        onclick: () => {
          const ok = window.confirm(
            `Delete the quiz "${entry.parsed.title}"? You can re-add it later if you have the .txt file.`,
          );
          if (!ok) return;
          removeUserQuiz(entry.id);
          if (onChange) onChange();
          close();
        },
      }, 'Delete quiz'),
    ));
  }

  panel.appendChild(status);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('open');
    panel.focus && panel.focus();
  });

  return { close };
}

function section(title, hint, ...children) {
  return el('section', { class: 'panel-section' },
    el('h3', { class: 'panel-section-title' }, title),
    el('p', { class: 'panel-section-hint' }, hint),
    ...children,
  );
}
