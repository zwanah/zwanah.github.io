// Image links still work normally when JavaScript or <dialog> is unavailable.
(() => {
  const dialog = document.querySelector('.figure-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('img');
  const title = dialog.querySelector('h2');
  const original = dialog.querySelector('.figure-original');
  let trigger;
  let previousOverflow;

  document.querySelectorAll('[data-figure-title]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      title.textContent = link.dataset.figureTitle;
      image.src = link.dataset.figureSrc || link.href;
      image.alt = link.dataset.figureTitle + ' — research figure';
      original.href = link.href;
      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    if (trigger) trigger.focus({ preventScroll: true });
  });
})();

// Keep an honest fallback until the provider supplies an actual visitor count.
(() => {
  const widget = document.querySelector('.visitor-widget');
  const status = document.querySelector('.visitor-status');
  if (!widget || !status) return;
  let timedOut = false;
  const update = () => {
    const count = widget.querySelector('.mapmyvisitors-visitors');
    status.hidden = Boolean(count && /[0-9]/.test(count.textContent));
    status.textContent = timedOut
      ? 'Visitor statistics service could not be reached. Please try again later.'
      : 'Loading visitor statistics…';
  };
  setTimeout(() => { timedOut = true; update(); }, 15000);
  new MutationObserver(update).observe(widget, { childList: true, subtree: true, characterData: true });
  update();
})();

// Scale the provider's complete 300px map, including markers and controls.
(() => {
  const frame = document.querySelector('.visitor-widget');
  if (!frame || typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(entries => {
    frame.style.setProperty('--visitor-scale', Math.min(1, entries[0].contentRect.width / 300));
  }).observe(frame);
})();

// Let a tall sidebar scroll into view before sticking at its bottom edge.
(() => {
  const sidebar = document.querySelector('.profile-sidebar');
  if (!sidebar) return;
  const update = () => {
    const top = Math.min(110, window.innerHeight - sidebar.getBoundingClientRect().height - 24);
    sidebar.style.setProperty('--sidebar-top', `${top}px`);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(sidebar);
  window.addEventListener('resize', update);
  update();
})();
