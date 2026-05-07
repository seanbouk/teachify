import './style.css';
import { loadCatalog, addUserQuiz } from './catalog.js';
import { applyOrder, saveOrder, promoteQuiz } from './order.js';
import { renderHome } from './ui/home.js';
import { renderPlay } from './ui/play.js';
import { openManagePanel } from './ui/manage.js';

const root = document.querySelector('#app');

const PLAY_PREFIX = '#play=';

async function routeFromUrl() {
  const catalog = applyOrder(await loadCatalog());
  const hash = location.hash || '';
  if (hash.startsWith(PLAY_PREFIX)) {
    const id = decodeURIComponent(hash.slice(PLAY_PREFIX.length));
    const entry = catalog.find((e) => e.id === id);
    if (entry) {
      renderPlayScreen(entry, catalog);
      return;
    }
    // Bad/stale hash — drop it and fall through to home.
    history.replaceState(null, '', stripHash());
  }
  renderHomeScreen(catalog);
}

function renderHomeScreen(catalog) {
  renderHome(root, {
    catalog,
    onPlay: (entry) => {
      history.pushState(null, '', PLAY_PREFIX + encodeURIComponent(entry.id));
      routeFromUrl();
    },
    onManage: (entry) => {
      openManagePanel({ entry, onChange: routeFromUrl });
    },
    onAdd: handleAdd,
    onReorder: (newOrder) => saveOrder(newOrder),
  });
}

function renderPlayScreen(entry, catalog) {
  let pinned = false;
  renderPlay(root, {
    entry,
    onAnswer: () => {
      if (pinned) return;
      pinned = true;
      promoteQuiz(entry.id, (catalog || []).map((e) => e.id));
    },
    onExit: () => history.back(),
  });
}

function stripHash() {
  return location.pathname + location.search;
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
      await routeFromUrl();
    } catch (err) {
      if (err && err.code === 'EXISTS') {
        const ok = window.confirm(`${err.message}\nReplace it with this version?`);
        if (!ok) return;
        try {
          await addUserQuiz(raw, { overwrite: true });
          await routeFromUrl();
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

// History wiring. popstate fires for browser back/forward AND the
// mouse "back" button, which is what we actually want — we just route
// off the current URL.
window.addEventListener('popstate', () => {
  routeFromUrl().catch((err) => console.error(err));
});

// Backspace = go back, unless the user is typing in an input.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Backspace') return;
  const t = e.target;
  if (t) {
    const tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || t.isContentEditable) return;
  }
  if (location.hash) {
    e.preventDefault();
    history.back();
  }
});

// Initial boot. If we land on #play=X directly (refresh, deep link),
// insert a "home" history entry behind so back has somewhere to go.
function init() {
  const initial = location.hash || '';
  if (initial.startsWith(PLAY_PREFIX)) {
    history.replaceState(null, '', stripHash());
    history.pushState(null, '', initial);
  }
  routeFromUrl().catch((err) => {
    console.error(err);
    root.textContent = 'Something went wrong loading Teachify.';
  });
}

init();
