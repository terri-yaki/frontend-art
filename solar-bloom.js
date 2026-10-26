(() => {
  'use strict';

  const EXHIBIT_ID = 'bloom';
  const MAX_BLOOMS = 9;
  const TAU = Math.PI * 2;
  const PAPER = '#f5efdc';
  const GROUND = '#ddd4b8';
  const LEAF_DARK = '#455d35';
  const LEAF = '#617c46';
  const OCHRE_DARK = '#72501b';
  const OCHRE = '#a97925';
  const GOLD = '#c39a49';
  const CREAM = '#dfcda0';
  const COLORS = [GROUND, LEAF_DARK, LEAF, OCHRE_DARK, OCHRE, GOLD, CREAM];
  const INITIAL_BLOOMS = [
    { x: 0.17, y: 0.3, growth: 1, scale: 0.9, delay: 0 },
    { x: 0.39, y: 0.22, growth: 0.72, scale: 0.76, delay: 0 },
    { x: 0.65, y: 0.34, growth: 0.52, scale: 1.08, delay: 0.6 },
    { x: 0.84, y: 0.2, growth: 0.9, scale: 0.68, delay: 1.2 },
    { x: 0.53, y: 0.54, growth: 0.36, scale: 0.65, delay: 1.8, desktop: true }
  ];
  const KEYBOARD_SPOTS = [
    { x: 0.28, y: 0.42 },
    { x: 0.73, y: 0.48 },
    { x: 0.5, y: 0.27 },
    { x: 0.86, y: 0.38 },
    { x: 0.13, y: 0.24 }
  ];

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function easeOut(value) {
    return 1 - Math.pow(1 - clamp(value), 2);
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function start() {
    const canvas = document.getElementById('bloom-canvas');
    const caption = document.getElementById('bloom-caption');
    const formLabel = document.getElementById('bloom-form');
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
    const maskSurfaces = [
      document.querySelector('.site-header'),
      document.querySelector('.site-footer'),
      caption
    ].filter(Boolean);
    const blooms = [];
    const raster = new Map();

    let width = 1;
    let height = 1;
    let dpr = 1;
    let fontSize = 13;
    let cellW = 8;
    let cellH = 14;
    let columns = 1;
    let rows = 1;
    let interfaceMask = new Uint8Array(1);
    let paused = motionQuery.matches;
    let frame = 0;
    let elapsed = 0;
    let lastTime = 0;
    let animationRequest = null;
    let seedCounter = 0;
    let plantedCount = 0;
    let keyboardIndex = 0;

    function isActive() {
      return gallery.is(EXHIBIT_ID);
    }

    function canAnimate() {
      return isActive() && !document.hidden && !paused;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function growingCount() {
      let count = 0;
      for (const bloom of blooms) {
        if (bloom.growth < 1 || bloom.delay > 0) count++;
      }
      return count;
    }

    function createBloom(x, y, growth, scale, delay = 0) {
      const id = ++seedCounter;
      const random = seededRandom(id * 971 + 0x51a7);
      const branchCount = 2 + Math.floor(random() * 2);
      const branches = [];
      for (let index = 0; index < branchCount; index++) {
        branches.push({
          at: 0.28 + index * 0.19 + random() * 0.07,
          side: (index + id) % 2 === 0 ? 1 : -1,
          length: 0.72 + random() * 0.5,
          lift: 0.3 + random() * 0.3
        });
      }
      return {
        id,
        x: clamp(x, 0.06, 0.94),
        y: clamp(y, 0.12, 0.7),
        rootX: clamp(x + (random() - 0.5) * 0.13, 0.035, 0.965),
        rootY: 0.865 + random() * 0.055,
        bend: (random() - 0.5) * 0.16,
        scale: scale * (0.88 + random() * 0.24),
        phase: random() * TAU,
        petals: 7 + Math.floor(random() * 4),
        duration: 11 + random() * 5,
        growth: clamp(growth),
        delay,
        branches
      };
    }

    function radiusFor(bloom) {
      return clamp(Math.min(width, height) * 0.078, 24, 68) * bloom.scale;
    }

    function stemPoint(bloom, t) {
      const rootX = bloom.rootX * width;
      const rootY = bloom.rootY * height;
      const targetX = bloom.x * width;
      const targetY = bloom.y * height;
      const wind = (
        Math.sin(elapsed * 0.74 + bloom.phase) * cellW * 1.3 * t * t
        + Math.sin(elapsed * 0.31 + bloom.phase * 1.7) * cellW * 0.5 * t
      );
      return {
        x: rootX + (targetX - rootX) * t + Math.sin(Math.PI * t) * bloom.bend * width + wind,
        y: rootY + (targetY - rootY) * t
      };
    }

    function updateFormLabel() {
      if (!formLabel) return;
      const count = String(blooms.length).padStart(2, '0');
      const growing = String(growingCount()).padStart(2, '0');
      formLabel.textContent = count + ' / specimens · ' + growing + ' unfurling';
    }

    function updateButton() {
      if (!isActive()) return;
      if (label) label.textContent = paused ? 'Resume motion' : 'Pause motion';
      if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
    }

    function maskInterface() {
      interfaceMask = new Uint8Array(columns * rows);
      if (!isActive()) return;
      const padding = 8;
      for (const surface of maskSurfaces) {
        const rect = surface.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const left = clamp(Math.floor((rect.left - padding) / cellW), 0, columns);
        const right = clamp(Math.ceil((rect.right + padding) / cellW), 0, columns);
        const top = clamp(Math.floor((rect.top - padding) / cellH), 0, rows);
        const bottom = clamp(Math.ceil((rect.bottom + padding) / cellH), 0, rows);
        for (let row = top; row < bottom; row++) {
          const offset = row * columns;
          interfaceMask.fill(1, offset + left, offset + right);
        }
      }
    }

    function put(column, row, char, color, priority = 0) {
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      const index = row * columns + column;
      if (interfaceMask[index]) return;
      const previous = raster.get(index);
      if (!previous || priority >= previous.priority) {
        raster.set(index, { column, row, char, color, priority });
      }
    }

    function putPixel(x, y, char, color, priority = 0) {
      put(Math.round(x / cellW), Math.round(y / cellH), char, color, priority);
    }

    function lineGlyph(dx, dy) {
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return '|';
      if (Math.abs(dx) > Math.abs(dy) * 1.8) return '-';
      return dx * dy > 0 ? '\\' : '/';
    }

    function drawLine(x0, y0, x1, y1, color, priority, forcedGlyph) {
      let column = Math.round(x0 / cellW);
      let row = Math.round(y0 / cellH);
      const endColumn = Math.round(x1 / cellW);
      const endRow = Math.round(y1 / cellH);
      const dx = Math.abs(endColumn - column);
      const dy = -Math.abs(endRow - row);
      const stepX = column < endColumn ? 1 : -1;
      const stepY = row < endRow ? 1 : -1;
      const glyph = forcedGlyph || lineGlyph(endColumn - column, endRow - row);
      let error = dx + dy;
      while (true) {
        put(column, row, glyph, color, priority);
        if (column === endColumn && row === endRow) break;
        const doubled = error * 2;
        if (doubled >= dy) {
          error += dy;
          column += stepX;
        }
        if (doubled <= dx) {
          error += dx;
          row += stepY;
        }
      }
    }

    function drawGround() {
      const firstRow = Math.floor(rows * 0.73);
      for (let row = firstRow; row < rows; row += 4) {
        for (let column = row % 3; column < columns; column += 5) {
          const mark = (column * 7 + row * 11) % 13;
          put(column, row, mark < 2 ? '+' : '.', GROUND, 0);
        }
      }
    }

    function drawLeaf(base, side, length, growth) {
      if (growth <= 0) return;
      const angle = side > 0 ? -0.58 : Math.PI + 0.58;
      const dx = Math.cos(angle) * length;
      const dy = Math.sin(angle) * length * 0.78;
      const steps = Math.max(4, Math.ceil(length / (cellW * 0.7)));
      for (let index = 0; index <= steps; index++) {
        const t = index / steps;
        if (t > growth) break;
        const local = t / growth;
        const centerX = base.x + dx * t;
        const centerY = base.y + dy * t;
        const span = Math.sin(Math.PI * local) * length * 0.19;
        putPixel(centerX, centerY, side > 0 ? '/' : '\\', LEAF_DARK, 2);
        if (span > cellW * 0.35) {
          putPixel(centerX - Math.sin(angle) * span, centerY + Math.cos(angle) * span, '.', LEAF, 2);
          putPixel(centerX + Math.sin(angle) * span, centerY - Math.cos(angle) * span, '.', LEAF, 2);
        }
      }
      putPixel(base.x + dx * growth, base.y + dy * growth, side > 0 ? '>' : '<', LEAF, 2);
    }

    function drawBranch(bloom, branch, stemGrowth) {
      if (stemGrowth <= branch.at) return;
      const growth = clamp((stemGrowth - branch.at) / 0.25);
      const base = stemPoint(bloom, branch.at);
      const radius = radiusFor(bloom);
      const length = radius * branch.length;
      let previous = base;
      const segments = 10;
      for (let index = 1; index <= segments; index++) {
        const t = index / segments * growth;
        const point = {
          x: base.x + branch.side * length * t,
          y: base.y - length * branch.lift * t - Math.sin(Math.PI * t) * length * 0.14
        };
        drawLine(previous.x, previous.y, point.x, point.y, LEAF_DARK, 1);
        previous = point;
      }
      drawLeaf(previous, branch.side, radius * 0.46, easeOut(growth));
      if (growth > 0.45) {
        drawLeaf(base, -branch.side, radius * 0.34, clamp((growth - 0.45) / 0.55));
      }
    }

    function drawPetal(center, angle, innerRadius, outerRadius, petalWidth, growth, color, priority) {
      const length = (outerRadius - innerRadius) * easeOut(growth);
      const steps = Math.max(5, Math.ceil(length / (cellW * 0.62)));
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const midrib = lineGlyph(cos, sin);
      for (let index = 0; index <= steps; index++) {
        const t = index / steps;
        const radial = innerRadius + length * t;
        const span = Math.sin(Math.PI * t) * petalWidth * (0.4 + growth * 0.6);
        for (let side = -1; side <= 1; side++) {
          const offset = side * span;
          const x = center.x + cos * radial - sin * offset;
          const y = center.y + sin * radial + cos * offset;
          let glyph;
          if (side === 0) glyph = t > 0.8 ? '*' : t > 0.18 ? midrib : ':';
          else glyph = t > 0.62 ? '.' : ':';
          const emphasis = side === 0 ? (t > 0.8 ? 0.3 : 0.2) : 0;
          putPixel(x, y, glyph, color, priority + emphasis);
        }
      }
    }

    function drawPetals(bloom, center) {
      const radius = radiusFor(bloom);
      const starts = [0.47, 0.55, 0.63];
      const durations = [0.34, 0.36, 0.37];
      const colors = [CREAM, GOLD, OCHRE];
      for (let layer = 2; layer >= 0; layer--) {
        const layerGrowth = clamp((bloom.growth - starts[layer]) / durations[layer]);
        if (layerGrowth <= 0) continue;
        const count = bloom.petals + layer * 2;
        const inner = radius * (0.08 + layer * 0.15);
        const outer = radius * (0.48 + layer * 0.26);
        for (let index = 0; index < count; index++) {
          const growth = clamp(layerGrowth * count - index);
          if (growth <= 0) continue;
          const angle = index / count * TAU + bloom.phase * 0.17 + layer * 0.31;
          drawPetal(center, angle, inner, outer, radius * 0.105, growth, colors[layer], 3 + (2 - layer));
        }
      }

      const centerGrowth = clamp((bloom.growth - 0.48) / 0.25);
      const centerRadius = radius * 0.19 * easeOut(centerGrowth);
      if (centerRadius <= 0) return;
      for (let y = -centerRadius; y <= centerRadius; y += cellH * 0.65) {
        for (let x = -centerRadius; x <= centerRadius; x += cellW * 0.65) {
          const distance = Math.hypot(x, y) / centerRadius;
          if (distance > 1) continue;
          const glyph = distance < 0.38 ? '@' : distance < 0.76 ? '%' : '#';
          putPixel(center.x + x, center.y + y, glyph, distance < 0.76 ? OCHRE_DARK : OCHRE, 7);
        }
      }
    }

    function drawBloom(bloom) {
      const stemGrowth = clamp(bloom.growth / 0.64);
      const root = stemPoint(bloom, 0);
      putPixel(root.x, root.y, bloom.growth < 0.2 ? '.' : ':', LEAF_DARK, 1);
      if (stemGrowth <= 0) return;

      const length = Math.hypot((bloom.x - bloom.rootX) * width, (bloom.y - bloom.rootY) * height);
      const segments = Math.max(12, Math.ceil(length / (cellH * 0.7)));
      let previous = root;
      for (let index = 1; index <= segments; index++) {
        const t = stemGrowth * index / segments;
        const point = stemPoint(bloom, t);
        drawLine(previous.x, previous.y, point.x, point.y, LEAF_DARK, 1);
        previous = point;
      }
      for (const branch of bloom.branches) drawBranch(bloom, branch, stemGrowth);
      drawPetals(bloom, previous);
    }

    function flushRaster() {
      ctx.font = fontSize + 'px "SFMono-Regular", "Cascadia Code", Consolas, monospace';
      ctx.textBaseline = 'top';
      for (const color of COLORS) {
        ctx.fillStyle = color;
        for (const cell of raster.values()) {
          if (cell.color !== color) continue;
          ctx.fillText(cell.char, Math.round(cell.column * cellW), Math.round(cell.row * cellH));
        }
      }
    }

    function draw() {
      if (!isActive()) return;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, width, height);
      raster.clear();
      drawGround();
      for (const bloom of blooms) drawBloom(bloom);
      flushRaster();
    }

    function resize() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = width < 600 ? 11 : 13;
      ctx.font = fontSize + 'px "SFMono-Regular", "Cascadia Code", Consolas, monospace';
      cellW = Math.max(6, ctx.measureText('M').width);
      cellH = Math.round(fontSize * 1.12);
      columns = Math.max(1, Math.ceil(width / cellW));
      rows = Math.max(1, Math.ceil(height / cellH));
      maskInterface();
      draw();
    }

    function resetGarden() {
      blooms.length = 0;
      seedCounter = 0;
      plantedCount = 0;
      keyboardIndex = 0;
      elapsed = 0;
      for (const specimen of INITIAL_BLOOMS) {
        if (specimen.desktop && width < 700) continue;
        blooms.push(createBloom(specimen.x, specimen.y, specimen.growth, specimen.scale, specimen.delay));
      }
      updateFormLabel();
      draw();
    }

    function plantNormalized(x, y, scale = 0.82) {
      if (blooms.length >= MAX_BLOOMS) blooms.shift();
      const growth = paused || motionQuery.matches ? 1 : 0.02;
      blooms.push(createBloom(x, y, growth, scale));
      plantedCount++;
      updateFormLabel();
      draw();
    }

    function plantAt(x, y) {
      const minimumY = Math.max(104, height * 0.13);
      const maximumY = Math.max(minimumY + 30, height * 0.68);
      plantNormalized(
        clamp(x / width, 0.06, 0.94),
        clamp(y, minimumY, maximumY) / height
      );
    }

    function updateGrowth(dt) {
      const before = growingCount();
      for (const bloom of blooms) {
        if (bloom.delay > 0) {
          bloom.delay = Math.max(0, bloom.delay - dt);
          continue;
        }
        if (bloom.growth < 1) bloom.growth = Math.min(1, bloom.growth + dt / bloom.duration);
      }
      if (growingCount() !== before) updateFormLabel();
    }

    function setPaused(value) {
      paused = value;
      lastTime = 0;
      updateButton();
      syncAnimation();
    }

    function animate(now) {
      animationRequest = null;
      if (!canAnimate()) {
        lastTime = 0;
        return;
      }
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;
      updateGrowth(dt);
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
      if (event.button !== 0 || isInterfaceTarget(event.target)) return;
      plantAt(event.clientX, event.clientY);
    });

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isInterfaceTarget(event.target)) return;
      const space = event.key === ' ' || event.key === 'Spacebar';
      const plant = event.key === 'b' || event.key === 'B' || event.key === 'Enter';
      const reset = event.key === 'r' || event.key === 'R';
      if (!space && !plant && !reset) return;
      event.preventDefault();
      if (event.repeat) return;
      if (space) {
        setPaused(!paused);
      } else if (reset) {
        resetGarden();
      } else {
        const spot = KEYBOARD_SPOTS[keyboardIndex % KEYBOARD_SPOTS.length];
        keyboardIndex++;
        plantNormalized(spot.x, spot.y, 0.76);
      }
    });

    button.addEventListener('click', () => {
      if (isActive()) setPaused(!paused);
    });
    if (resetButton) resetButton.addEventListener('click', () => {
      if (isActive()) resetGarden();
    });

    canvas.style.touchAction = 'none';
    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    listenActive('resize', resize, { passive: true });
    window.solarBloom = {
      get frame() { return frame; },
      get paused() { return paused; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get reducedMotion() { return motionQuery.matches; },
      get bloomCount() { return blooms.length; },
      get plantCount() { return blooms.length; },
      get plantedCount() { return plantedCount; },
      get totalPlanted() { return plantedCount; },
      get growingCount() { return growingCount(); },
      get maxBlooms() { return MAX_BLOOMS; },
      get growth() { return blooms.map((bloom) => bloom.growth); },
      get blooms() {
        return blooms.map((bloom) => ({
          id: bloom.id,
          growth: bloom.growth,
          delay: bloom.delay,
          x: bloom.x * width,
          y: bloom.y * height
        }));
      },
      get width() { return width; },
      get height() { return height; },
      get columns() { return columns; },
      get rows() { return rows; },
      get cellWidth() { return cellW; },
      get cellHeight() { return cellH; },
      get glyphCount() { return raster.size; }
    };

    updateButton();
    resize();
    resetGarden();
    gallery.subscribe((id) => {
      if (id === EXHIBIT_ID) {
        updateButton();
        updateFormLabel();
        if (width !== window.innerWidth || height !== window.innerHeight || dpr !== Math.min(2, Math.max(1, window.devicePixelRatio || 1))) {
          resize();
        } else {
          maskInterface();
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
