import './style.css';
import { loadCatalog, addUserQuiz } from './catalog.js';
import { applyOrder, saveOrder, promoteQuiz } from './order.js';
import { renderHome } from './ui/home.js';
import { renderPlay } from './ui/play.js';
import { openManagePanel } from './ui/manage.js';

const root = document.querySelector('#app');

async function showHome() {
  const raw = await loadCatalog();
  const catalog = applyOrder(raw);
  renderHome(root, {
    catalog,
    onPlay: (entry) => showPlay(entry, catalog),
    onManage: (entry) => {
      openManagePanel({ entry, onChange: showHome });
    },
    onAdd: handleAdd,
    onReorder: (newOrder) => {
      saveOrder(newOrder);
      // No re-render — the DOM is already in the new order from the drag.
    },
  });
}

function showPlay(entry, catalog) {
  let pinned = false;
  renderPlay(root, {
    entry,
    onAnswer: () => {
      if (pinned) return;
      pinned = true;
      // Pop this quiz to the top once the user has answered at least one
      // question this session. Seed with the existing on-screen order so
      // we don't collapse the rest into catalog default.
      const knownIds = (catalog || []).map((e) => e.id);
      promoteQuiz(entry.id, knownIds);
    },
    onExit: showHome,
  });
}

async function handleAdd() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,text/plain,.md,.markdown';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.remove();
    if (!f) return;

    let raw;
    try {
      raw = await f.text();
    } catch {
      window.alert('Could not read that file.');
      return;
    }

    try {
      await addUserQuiz(raw);
      await showHome();
    } catch (err) {
      if (err && err.code === 'EXISTS') {
        const ok = window.confirm(`${err.message}\nReplace it with this version?`);
        if (!ok) return;
        try {
          await addUserQuiz(raw, { overwrite: true });
          await showHome();
        } catch (err2) {
          window.alert(err2.message || 'Failed to replace quiz.');
        }
      } else {
        window.alert((err && err.message) || 'Could not add that quiz.');
      }
    }
  });

  input.click();
}

showHome().catch((err) => {
  console.error(err);
  root.textContent = 'Something went wrong loading Teachify.';
});
