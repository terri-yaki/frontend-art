(() => {
  'use strict';

  const BACKGROUND = '#050a07';
  const GREEN = '#55ff7f';
  const HEAD = '#e6ffeb';
  const GLYPHS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}+-*/=|:;';
  const MAX_STREAMS = 72;

  function start() {
    const canvas = document.getElementById('rain-canvas');
    const formLabel = document.getElementById('rain-form');
    const button = document.getElementById('motion-toggle');
    const resetButton = document.getElementById('view-reset');
    const gallery = window.frontendGallery;
    if (!canvas || !button || !gallery) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const label = button.querySelector('.control-label');
    const icon = button.querySelector('.control-icon');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const addWindowListener = window.addEventListener.bind(window);
    const streams = [];

    let width = 0;
    let height = 0;
    let dpr = 1;
    let bottomShade = null;
    let fontSize = 14;
    let cellW = 14;
    let cellH = 18;
    let columns = 1;
    let rows = 1;
    let paused = motionQuery.matches;
    let frame = 0;
    let lastTime = 0;
    let animationRequest = null;
    let activeGlyphs = 0;
    let injectedCount = 0;
    let seed = (Math.random() * 4294967296) >>> 0;

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function clamp(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }

    function randomGlyph() {
      return GLYPHS[Math.floor(random() * GLYPHS.length)];
    }

    function isActive() {
      return gallery.is('rain');
    }

    function canAnimate() {
      return isActive() && !paused && !document.hidden;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function targetStreamCount() {
      return clamp(Math.round(columns * 0.34), 10, 36);
    }

    function streamLength() {
      const maximum = Math.max(8, Math.min(28, Math.floor(rows * 0.55)));
      return 7 + Math.floor(random() * (maximum - 6));
    }

    function populateStream(stream, initial, injected) {
      stream.length = streamLength();
      stream.speed = 7 + random() * 13;
      stream.brightness = 0.45 + random() * 0.55;
      stream.mutationRate = 1.5 + random() * 4.5;
      stream.mutationClock = random();
      stream.glyphs = Array.from({ length: stream.length }, randomGlyph);
      stream.injected = injected;
      if (injected) {
        stream.head = 0;
        stream.speed = 15 + random() * 10;
        stream.brightness = 0.85 + random() * 0.15;
      } else if (initial) {
        stream.head = random() * (rows + stream.length);
      } else {
        stream.column = Math.floor(random() * columns);
        stream.head = -1 - random() * stream.length * 1.5;
      }
      return stream;
    }

    function createStream(column, initial, injected = false) {
      return populateStream({ column }, initial, injected);
    }

    function createInitialStreams() {
      streams.length = 0;
      const count = targetStreamCount();
      for (let index = 0; index < count; index++) {
        const column = Math.min(columns - 1, Math.floor((index + random()) * columns / count));
        streams.push(createStream(column, true));
      }
    }

    function updateFormLabel() {
      if (!formLabel) return;
      const count = String(streams.length).padStart(2, '0');
      formLabel.textContent = count + ' / ' + (streams.length === 1 ? 'Stream' : 'Streams');
    }

    function drawGlyph(glyph, column, row) {
      ctx.fillText(glyph, column * cellW + Math.floor(cellW / 2), row * cellH);
      activeGlyphs++;
    }

    function draw() {
      activeGlyphs = 0;
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, width, height);
      ctx.font = fontSize + 'px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (const stream of streams) {
        const headRow = Math.floor(stream.head);
        for (let index = stream.length - 1; index >= 0; index--) {
          const row = headRow - index;
          if (row < 0 || row >= rows) continue;
          if (index === 0) {
            ctx.fillStyle = HEAD;
            ctx.globalAlpha = 1;
            ctx.shadowColor = GREEN;
            ctx.shadowBlur = 10 + stream.brightness * 8;
          } else {
            const fade = 1 - index / stream.length;
            ctx.fillStyle = GREEN;
            ctx.globalAlpha = Math.max(0.06, stream.brightness * fade * fade * 0.9);
            ctx.shadowBlur = 0;
          }
          drawGlyph(stream.glyphs[index], stream.column, row);
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = bottomShade;
      const bottomDepth = Math.min(160, height * 0.36);
      ctx.fillRect(0, height - bottomDepth, width, bottomDepth);
    }

    function resize() {
      const previousColumns = columns;
      const previousRows = rows;
      const hadStreams = streams.length > 0;
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      fontSize = width < 600 ? 12 : 14;
      cellW = fontSize;
      cellH = Math.round(fontSize * 1.3);
      columns = Math.max(1, Math.ceil(width / cellW));
      rows = Math.max(1, Math.ceil(height / cellH));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bottomDepth = Math.min(160, height * 0.36);
      bottomShade = ctx.createLinearGradient(0, height - bottomDepth, 0, height);
      bottomShade.addColorStop(0, 'rgba(5, 10, 7, 0)');
      bottomShade.addColorStop(0.58, 'rgba(5, 10, 7, 0.42)');
      bottomShade.addColorStop(1, 'rgba(5, 10, 7, 0.88)');

      if (!hadStreams) {
        createInitialStreams();
      } else {
        for (const stream of streams) {
          stream.column = clamp(
            Math.round((stream.column + 0.5) / previousColumns * columns - 0.5),
            0,
            columns - 1
          );
          stream.head = stream.head / previousRows * rows;
        }
        const target = targetStreamCount();
        while (streams.length > target) {
          const naturalIndex = streams.findIndex((stream) => !stream.injected);
          if (naturalIndex < 0) break;
          streams.splice(naturalIndex, 1);
        }
        while (streams.length < target) {
          streams.push(createStream(Math.floor(random() * columns), true));
        }
      }
      lastTime = 0;
      updateFormLabel();
      draw();
    }

    function injectAtColumn(column) {
      if (streams.length >= MAX_STREAMS) streams.shift();
      streams.push(createStream(clamp(column, 0, columns - 1), false, true));
      injectedCount++;
      updateFormLabel();
      draw();
    }

    function injectAtX(clientX) {
      injectAtColumn(Math.floor(clamp(clientX, 0, width - 1) / cellW));
    }

    function resetRain() {
      frame = 0;
      lastTime = 0;
      injectedCount = 0;
      createInitialStreams();
      updateFormLabel();
      draw();
    }

    function updateButton() {
      if (!isActive()) return;
      if (label) label.textContent = paused ? 'Resume motion' : 'Pause motion';
      if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
    }

    function setPaused(value) {
      paused = value;
      lastTime = 0;
      updateButton();
      syncAnimation();
    }

    function update(dt) {
      for (const stream of streams) {
        stream.head += stream.speed * dt;
        stream.mutationClock += stream.mutationRate * dt;
        while (stream.mutationClock >= 1) {
          const index = Math.floor(random() * stream.length);
          stream.glyphs[index] = randomGlyph();
          stream.mutationClock -= 1;
        }
        if (stream.head - stream.length > rows + 1) populateStream(stream, false, false);
      }
    }

    function animate(now) {
      animationRequest = null;
      if (!canAnimate()) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(0.05, Math.max(0, (now - lastTime) / 1000)) : 0;
      lastTime = now;
      update(dt);
      draw();
      frame++;
      if (canAnimate()) animationRequest = requestAnimationFrame(animate);
      else lastTime = 0;
    }

    function syncAnimation() {
      if (!canAnimate()) {
        if (animationRequest !== null) cancelAnimationFrame(animationRequest);
        animationRequest = null;
        lastTime = 0;
        return;
      }
      if (animationRequest === null) {
        lastTime = 0;
        animationRequest = requestAnimationFrame(animate);
      }
    }

    function isInterfaceTarget(target) {
      return target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]');
    }

    listenActive('click', (event) => {
      if ((event.button !== undefined && event.button !== 0) || isInterfaceTarget(event.target)) return;
      injectAtX(event.clientX);
    });

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || isInterfaceTarget(event.target)) return;
      let handled = true;
      if (event.key === 'Enter') injectAtColumn(Math.floor(columns / 2));
      else if (event.key === 'r' || event.key === 'R') resetRain();
      else if (event.key === ' ' || event.key === 'Spacebar') setPaused(!paused);
      else handled = false;
      if (handled) event.preventDefault();
    });

    button.addEventListener('click', () => {
      if (isActive()) setPaused(!paused);
    });
    if (resetButton) resetButton.addEventListener('click', () => {
      if (isActive()) resetRain();
    });

    canvas.style.touchAction = 'none';
    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    listenActive('resize', resize, { passive: true });
    window.dataRain = {
      get frame() { return frame; },
      get paused() { return paused; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get streamCount() { return streams.length; },
      get injectedCount() { return injectedCount; },
      get activeGlyphs() { return activeGlyphs; },
      get width() { return width; },
      get height() { return height; },
      get dpr() { return dpr; },
      get columns() { return columns; },
      get rows() { return rows; },
      get cellWidth() { return cellW; },
      get cellHeight() { return cellH; },
      get fontSize() { return fontSize; },
      get streams() {
        return streams.map((stream) => ({
          column: stream.column,
          head: stream.head,
          speed: stream.speed,
          length: stream.length,
          brightness: stream.brightness,
          injected: stream.injected,
          glyphs: stream.glyphs.slice()
        }));
      }
    };

    updateButton();
    if (isActive()) resize();
    gallery.subscribe(() => {
      if (isActive()) {
        updateButton();
        const normalizedDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        if (!streams.length || width !== window.innerWidth || height !== window.innerHeight || dpr !== normalizedDpr) {
          resize();
        } else {
          draw();
        }
      }
      syncAnimation();
    });
    syncAnimation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
