(() => {
  'use strict';

  const exhibits = [
    {
      id: 'koi',
      title: 'Koi',
      medium: 'Characters become creatures.',
      status: 'Generative study',
      view: 'Top view',
      hint: 'Drag to orbit · Click for ripples'
    },
    {
      id: 'sculpture',
      title: 'Sculpture',
      medium: 'Characters become form.',
      status: 'Generative study',
      view: 'Perspective',
      hint: 'Drag / arrows · M to morph'
    },
    {
      id: 'neon',
      title: 'Neon Flow',
      medium: 'Particles trace invisible currents.',
      status: 'Flow study',
      view: 'Flow field',
      hint: 'Move to bend the current'
    },
    {
      id: 'bloom',
      title: 'Solar Bloom',
      medium: 'Characters become botany.',
      status: 'Growth study',
      view: 'Plan view',
      hint: 'Click to plant a bloom'
    },
    {
      id: 'rain',
      title: 'Data Rain',
      medium: 'Characters become data.',
      status: 'Stream study',
      view: 'Glyph field',
      hint: 'Click to inject a stream'
    },
    {
      id: 'ember',
      title: 'Ember',
      medium: 'Particles become heat.',
      status: 'Particle study',
      view: 'Thermal field',
      hint: 'Click to add a burst'
    },
    {
      id: 'prism',
      title: 'Prism',
      medium: 'Geometry becomes spectrum.',
      status: 'Refraction study',
      view: 'Perspective',
      hint: 'Drag to rotate · Click for color'
    }
  ];
  const metadata = new Map(exhibits.map((exhibit) => [exhibit.id, exhibit]));
  const links = Array.from(document.querySelectorAll('[data-gallery-link]'));
  const panels = Array.from(document.querySelectorAll('[data-gallery-exhibit]'));
  const mediumNote = document.querySelector('.medium-note');
  const statusKind = document.querySelector('.status-kind');
  const statusView = document.querySelector('.status-view');
  const orbitHint = document.querySelector('.orbit-hint');
  const morphToggle = document.getElementById('morph-toggle');
  const subscribers = new Set();

  function normalize(id) {
    return metadata.has(id) ? id : 'koi';
  }

  function idFromHash() {
    return normalize(window.location.hash.slice(1));
  }

  let current = idFromHash();

  function render(id) {
    const changed = current !== id;
    const exhibit = metadata.get(id);
    current = id;
    document.body.dataset.exhibit = id;
    document.title = exhibit.title + ' — Frontend Art';
    for (const panel of panels) {
      const active = panel.dataset.galleryExhibit === id;
      panel.hidden = !active;
      const title = active && panel.querySelector('[data-gallery-title]');
      if (title) title.textContent = exhibit.title;
    }
    for (const link of links) {
      if (link.dataset.galleryLink === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    if (mediumNote) mediumNote.textContent = exhibit.medium;
    if (statusKind) statusKind.textContent = exhibit.status;
    if (statusView) statusView.textContent = exhibit.view;
    if (orbitHint) orbitHint.textContent = exhibit.hint;
    if (morphToggle) morphToggle.hidden = id !== 'sculpture';
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
