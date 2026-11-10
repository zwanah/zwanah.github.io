// Keep the full navigation available when JavaScript is unavailable.
(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!header || !toggle || !nav) return;
  const compact = window.matchMedia('(max-width: 1200px)');
  const setOpen = open => toggle.setAttribute('aria-expanded', String(open));
  const close = () => {
    if (compact.matches && nav.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    setOpen(false);
  };
  toggle.hidden = false;
  header.classList.add('nav-ready');
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !compact.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false);
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close();
      toggle.focus({ preventScroll: true });
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) close();
  });
  header.addEventListener('focusout', event => {
    if (!header.contains(event.relatedTarget)) setOpen(false);
  });
  compact.addEventListener('change', () => {
    close();
    if (!compact.matches && document.activeElement === toggle) nav.querySelector('a').focus({ preventScroll: true });
  });
})();

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

// Fit the map and its markers uniformly inside the shared-height visual area.
(() => {
  const frame = document.querySelector('.visitor-widget');
  if (!frame || typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    frame.style.setProperty('--visitor-scale', Math.min(width / 300, Math.max(0, height - 32) / 147.06));
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
