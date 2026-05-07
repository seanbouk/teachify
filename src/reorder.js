// Drag-to-reorder for the quiz card grid. Pointer events for desktop +
// touch. The handle on each card is the drag trigger (clicking the rest
// of the card still plays the quiz).
//
// Strategy: while dragging, the chosen card follows the cursor via
// transform; on drop, the DOM is reordered in place and the new sequence
// is reported back via onCommit. A floating drop-indicator line shows
// the insertion point, coloured to match the dragged card's accent.

let dropIndicator = null;

function ensureIndicator() {
  if (!dropIndicator) {
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    document.body.appendChild(dropIndicator);
  }
  return dropIndicator;
}

function showIndicator(target, position, accent) {
  const ind = ensureIndicator();
  if (accent) ind.style.setProperty('--card-accent', accent);
  const r = target.getBoundingClientRect();
  ind.style.top = `${r.top + 6}px`;
  ind.style.height = `${r.height - 12}px`;
  if (position === 'before') {
    ind.style.left = `${r.left - 7}px`;
  } else {
    ind.style.left = `${r.right + 3}px`;
  }
  ind.classList.add('visible');
}

function hideIndicator() {
  if (dropIndicator) dropIndicator.classList.remove('visible');
}

function tearDownIndicator() {
  if (dropIndicator) {
    dropIndicator.remove();
    dropIndicator = null;
  }
}

export function makeReorderable(grid, onCommit) {
  let dragging = null;

  function getCards() {
    return Array.from(grid.querySelectorAll('.card[data-quiz-id]'));
  }

  function findCardAt(x, y, exclude) {
    for (const c of getCards()) {
      if (c === exclude) continue;
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c;
    }
    return null;
  }

  function start(handle, card, e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    try { handle.setPointerCapture(e.pointerId); } catch { /* */ }

    dragging = {
      card,
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      accent: getComputedStyle(card).getPropertyValue('--card-accent').trim() || 'var(--primary)',
    };
    document.body.classList.add('reordering');
  }

  function move(e) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;

    if (!dragging.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      dragging.moved = true;
      dragging.card.classList.add('dragging');
    }

    dragging.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;

    const target = findCardAt(e.clientX, e.clientY, dragging.card);
    if (target) {
      const r = target.getBoundingClientRect();
      // Decide before/after by whichever edge of target the cursor is closer to.
      const fromLeft = e.clientX - r.left;
      const fromRight = r.right - e.clientX;
      const before = fromLeft <= fromRight;
      showIndicator(target, before ? 'before' : 'after', dragging.accent);
    } else {
      hideIndicator();
    }
  }

  function commit(e) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    try { dragging.handle.releasePointerCapture(e.pointerId); } catch { /* */ }
    document.body.classList.remove('reordering');

    if (dragging.moved) {
      const target = findCardAt(e.clientX, e.clientY, dragging.card);
      if (target && target !== dragging.card) {
        const r = target.getBoundingClientRect();
        const fromLeft = e.clientX - r.left;
        const fromRight = r.right - e.clientX;
        const before = fromLeft <= fromRight;
        if (before) target.parentNode.insertBefore(dragging.card, target);
        else target.parentNode.insertBefore(dragging.card, target.nextSibling);
      }
    }

    dragging.card.classList.remove('dragging');
    dragging.card.style.transform = '';
    hideIndicator();

    if (dragging.moved) {
      const newOrder = getCards().map((c) => c.dataset.quizId).filter(Boolean);
      onCommit(newOrder);
    }
    dragging = null;
  }

  function cancel(e) {
    if (!dragging || (e && dragging.pointerId !== e.pointerId)) return;
    try { dragging.handle.releasePointerCapture(dragging.pointerId); } catch { /* */ }
    document.body.classList.remove('reordering');
    dragging.card.classList.remove('dragging');
    dragging.card.style.transform = '';
    hideIndicator();
    dragging = null;
  }

  function attach(card) {
    const handle = card.querySelector('.drag-handle');
    if (!handle) return;
    handle.addEventListener('pointerdown', (e) => start(handle, card, e));
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', commit);
    handle.addEventListener('pointercancel', cancel);
    handle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  return { attach, tearDown: tearDownIndicator };
}
