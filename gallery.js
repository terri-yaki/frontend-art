(() => {
  'use strict';

  const exhibitIds = ['koi', 'sculpture'];
  const links = Array.from(document.querySelectorAll('[data-gallery-link]'));
  const panels = Array.from(document.querySelectorAll('[data-gallery-exhibit]'));
  const subscribers = new Set();

  function normalize(id) {
    return exhibitIds.includes(id) ? id : 'koi';
  }

  function idFromHash() {
    return normalize(window.location.hash.slice(1));
  }

  let current = idFromHash();

  function render(id) {
    const changed = current !== id;
    current = id;
    document.body.dataset.exhibit = id;
    document.title = (id === 'sculpture' ? 'Sculpture' : 'Koi') + ' — Frontend Art';
    for (const panel of panels) panel.hidden = panel.dataset.galleryExhibit !== id;
    for (const link of links) {
      if (link.dataset.galleryLink === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    if (!changed) return;
    for (const callback of subscribers) callback(id);
    window.dispatchEvent(new CustomEvent('gallery:change', { detail: { id } }));
  }

  function show(id) {
    const next = normalize(id);
    const hash = '#' + next;
    if (window.location.hash !== hash) window.location.hash = hash;
    render(next);
  }

  window.frontendGallery = {
    get current() { return current; },
    is(id) { return current === id; },
    show,
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };

  for (const link of links) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      show(link.dataset.galleryLink);
    });
  }

  window.addEventListener('hashchange', () => render(idFromHash()));
  render(current);
})();
