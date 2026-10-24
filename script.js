(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const HISTORY_SIZE = 240;
  const HISTORY_STEP = 2;
  const MAX_RIPPLES = 14;
  const BODY_PROFILE = [
    [0.00, 0.72], [0.06, 1.65], [0.16, 2.55], [0.30, 3.08],
    [0.46, 2.88], [0.62, 2.28], [0.78, 1.52], [0.91, 0.82], [1.00, 0.52]
  ];
  const PALETTES = [
    ['#41423e', '#b9653e', '#9f4437', '#77766e'],
    ['#55524b', '#bd7548', '#88463b', '#838078'],
    ['#353936', '#a95738', '#b14b3c', '#6f716b'],
    ['#605b52', '#c07a48', '#9c5140', '#888278'],
    ['#484943', '#ad633f', '#913d34', '#7b796f'],
    ['#3d403d', '#bd7044', '#a64c3c', '#73766f'],
    ['#57544d', '#a85c3d', '#b04839', '#817e74'],
    ['#40423e', '#c07848', '#964438', '#777970']
  ];

  function start() {
    const canvas = document.getElementById('pond');
    const button = document.getElementById('motion-toggle');
    if (!canvas || !button) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const label = button.querySelector('.control-label');
    const icon = button.querySelector('.control-icon');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const water = [];
    const ripples = [];
    const fishes = [];
    const point = { x: 0, y: 0, a: 0 };
    let width = 1;
    let height = 1;
    let dpr = 1;
    let fontSize = 9;
    let cellW = 5;
    let cellH = 11;
    let columns = 1;
    let rows = 1;
    let cells = [];
    let cellColors = [];
    let cellAlphas = [];
    let cellOwners = new Int16Array(1);
    let cellPriorities = new Uint8Array(1);
    let background = null;
    let paused = motionQuery.matches;
    let pausedByVisibility = false;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let nextRipple = 2.5;
    let seed = 9317;

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function angleDelta(target, current) {
      let difference = (target - current + Math.PI) % TAU;
      if (difference < 0) difference += TAU;
      return difference - Math.PI;
    }

    function Fish(index) {
      this.index = index;
      this.x = 0;
      this.y = 0;
      this.heading = 0;
      this.turn = 0;
      this.scale = 0.88 + random() * 0.28;
      this.speed = 15 + random() * 8;
      this.phase = random() * TAU;
      this.wanderSpeed = 0.30 + random() * 0.28;
      this.pattern = index * 3 + Math.floor(random() * 3);
      this.palette = PALETTES[index % PALETTES.length];
      this.history = new Float32Array(HISTORY_SIZE * 3);
      this.head = 0;
      this.count = 0;
      this.bodyLength = 90;
      this.tailLength = 26;
    }

    function initializeFish(fish, x, y, heading) {
      fish.x = x;
      fish.y = y;
      fish.heading = heading;
      fish.turn = 0;
      fish.bodyLength = cellW * 17.5 * fish.scale;
      fish.tailLength = cellW * 5.5 * fish.scale;
      const totalLength = fish.bodyLength + fish.tailLength;
      fish.count = Math.min(HISTORY_SIZE, Math.ceil(totalLength / HISTORY_STEP) + 4);
      fish.head = fish.count - 1;
      for (let i = 0; i < fish.count; i++) {
        const offset = (fish.count - 1 - i) * HISTORY_STEP;
        const at = i * 3;
        fish.history[at] = x - Math.cos(heading) * offset;
        fish.history[at + 1] = y - Math.sin(heading) * offset;
        fish.history[at + 2] = heading;
      }
    }

    function recordPosition(fish) {
      const at = fish.head * 3;
      const dx = fish.x - fish.history[at];
      const dy = fish.y - fish.history[at + 1];
      if (dx * dx + dy * dy < HISTORY_STEP * HISTORY_STEP) {
        fish.history[at + 2] = fish.heading;
        return;
      }
      fish.head = (fish.head + 1) % HISTORY_SIZE;
      if (fish.count < HISTORY_SIZE) fish.count++;
      const next = fish.head * 3;
      fish.history[next] = fish.x;
      fish.history[next + 1] = fish.y;
      fish.history[next + 2] = fish.heading;
    }

    function spineAt(fish, distance, out) {
      let newer = fish.head;
      let newerAt = newer * 3;
      let nx = fish.history[newerAt];
      let ny = fish.history[newerAt + 1];
      let walked = 0;
      for (let i = 1; i < fish.count; i++) {
        const older = (newer - 1 + HISTORY_SIZE) % HISTORY_SIZE;
        const olderAt = older * 3;
        const ox = fish.history[olderAt];
        const oy = fish.history[olderAt + 1];
        const dx = nx - ox;
        const dy = ny - oy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0.001 && walked + length >= distance) {
          const mix = (distance - walked) / length;
          out.x = nx - dx * mix;
          out.y = ny - dy * mix;
          out.a = Math.atan2(dy, dx);
          return out;
        }
        walked += length;
        newer = older;
        nx = ox;
        ny = oy;
      }
      out.x = nx;
      out.y = ny;
      out.a = fish.history[newer * 3 + 2];
      return out;
    }

    function allocateGrid() {
      const size = columns * rows;
      cells = new Array(size);
      cellColors = new Array(size);
      cellAlphas = new Float32Array(size);
      cellOwners = new Int16Array(size);
      cellPriorities = new Uint8Array(size);
    }

    function clearGrid() {
      cells.fill(null);
      cellOwners.fill(-1);
      cellPriorities.fill(0);
    }

    function putCell(column, row, character, color, alpha, owner, priority) {
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      const index = row * columns + column;
      const occupant = cellOwners[index];
      if (occupant >= 0 && (occupant !== owner || cellPriorities[index] > priority)) return;
      cells[index] = character;
      cellColors[index] = color;
      cellAlphas[index] = alpha;
      cellOwners[index] = owner;
      cellPriorities[index] = priority;
    }

    function putWater(column, row, character, color, alpha) {
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      const index = row * columns + column;
      if (cells[index]) return;
      putCell(column, row, character, color, alpha, -1, 0);
    }

    function putFish(column, row, character, color, alpha, fish, priority) {
      putCell(column, row, character, color, alpha, fish.index, priority);
    }

    function populateWater() {
      water.length = 0;
      const count = Math.min(180, Math.floor(columns * rows / 58));
      for (let i = 0; i < count; i++) {
        water.push({
          column: Math.floor(random() * columns),
          row: Math.floor(random() * rows),
          glyph: random() < 0.82 ? '.' : "'",
          phase: random() * TAU,
          drift: 0.12 + random() * 0.25,
          shade: random()
        });
      }
    }

    function desiredFishCount() {
      if (width < 370) return 5;
      if (width < 560) return 6;
      return 8;
    }

    function resize() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      fontSize = width < 600 ? 7 : (width < 1100 ? 8 : 9);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontSize + 'px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      cellW = Math.max(4, Math.round(ctx.measureText('M').width));
      cellH = fontSize + 2;
      columns = Math.ceil(width / cellW);
      rows = Math.ceil(height / cellH);
      allocateGrid();
      background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#f7f5ef');
      background.addColorStop(0.48, '#f3f1eb');
      background.addColorStop(1, '#eeece5');
      populateWater();
      ripples.length = 0;

      const count = desiredFishCount();
      fishes.length = Math.min(fishes.length, count);
      while (fishes.length < count) fishes.push(new Fish(fishes.length));
      const layoutColumns = width < 600 ? 2 : 4;
      const layoutRows = Math.ceil(count / layoutColumns);
      const marginX = Math.min(width * 0.17, 105);
      const marginY = Math.min(height * 0.15, 100);
      for (let i = 0; i < fishes.length; i++) {
        const column = i % layoutColumns;
        const row = Math.floor(i / layoutColumns);
        const x = marginX + (width - marginX * 2) * (column + 0.5) / layoutColumns;
        const y = marginY + (height - marginY * 2) * (row + 0.5) / layoutRows;
        initializeFish(fishes[i], x, y, random() * TAU);
      }
      draw();
    }

    function bodyWidth(progress) {
      for (let i = 1; i < BODY_PROFILE.length; i++) {
        if (progress <= BODY_PROFILE[i][0]) {
          const previous = BODY_PROFILE[i - 1];
          const next = BODY_PROFILE[i];
          const mix = (progress - previous[0]) / (next[0] - previous[0]);
          return previous[1] + (next[1] - previous[1]) * mix;
        }
      }
      return BODY_PROFILE[BODY_PROFILE.length - 1][1];
    }

    function cellNoise(column, row, fish) {
      const hash = Math.imul(column + 31, 73856093) ^ Math.imul(row + 47, 19349663) ^ Math.imul(fish.pattern + 11, 83492791);
      return ((hash >>> 0) & 1023) / 1023;
    }

    function bodyCharacter(progress, edge, noise) {
      if (edge > 0.93) return noise < 0.55 ? ':' : '.';
      if (edge > 0.78) return noise < 0.58 ? 'o' : ':';
      if (edge > 0.58) return noise < 0.24 ? '0' : (noise < 0.78 ? 'O' : 'o');
      if (progress < 0.17) return noise < 0.28 ? '0' : (noise < 0.82 ? 'O' : '@');
      if (noise < 0.11) return '#';
      if (noise < 0.35) return '@';
      if (noise < 0.57) return '0';
      return noise < 0.88 ? 'O' : 'o';
    }

    function bodyColor(fish, progress, lateral, edge) {
      const marking = Math.sin(progress * 11 + fish.pattern * 1.37 + lateral * 0.42)
        + Math.sin(progress * 23 - lateral * 0.81 + fish.pattern * 0.63) * 0.42;
      if (marking > 0.93) return fish.palette[1];
      if (marking < -1.16) return fish.palette[2];
      return edge > 0.80 ? fish.palette[3] : fish.palette[0];
    }

    function drawTail(fish) {
      const wag = Math.sin(elapsed * 3.1 + fish.phase) * 0.48;
      const steps = Math.ceil(fish.tailLength / Math.max(1, cellW * 0.30));
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        spineAt(fish, fish.bodyLength + progress * fish.tailLength, point);
        const normalX = -Math.sin(point.a);
        const normalY = Math.cos(point.a);
        const halfWidth = (0.46 + Math.sin(progress * Math.PI * 0.5) * 3.15) * cellW * fish.scale;
        const notch = Math.max(0, (progress - 0.58) / 0.42) * 2.20 * cellW * fish.scale;
        const radius = Math.ceil(halfWidth / Math.min(cellW, cellH)) + 1;
        for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
          for (let columnOffset = -radius; columnOffset <= radius; columnOffset++) {
            const column = Math.round(point.x / cellW) + columnOffset;
            const row = Math.round(point.y / cellH) + rowOffset;
            const dx = column * cellW - point.x;
            const dy = row * cellH - point.y;
            const lateral = dx * normalX + dy * normalY - wag * progress * cellW;
            const distanceFromCenter = Math.abs(lateral);
            if (distanceFromCenter > halfWidth || distanceFromCenter < notch) continue;
            const edge = distanceFromCenter / Math.max(1, halfWidth);
            const noise = cellNoise(column, row, fish);
            const character = edge > 0.82 ? (noise < 0.65 ? ':' : '.') : (noise < 0.30 ? '0' : (noise < 0.82 ? 'o' : 'O'));
            const color = progress < 0.30 && noise > 0.60 ? fish.palette[1] : fish.palette[3];
            putFish(column, row, character, color, 0.62 + (1 - progress) * 0.22, fish, 1);
          }
        }
      }
    }

    function drawFins(fish) {
      const beat = Math.sin(elapsed * 3.7 + fish.phase);
      for (let pair = 0; pair < 2; pair++) {
        const progress = pair === 0 ? 0.34 : 0.63;
        const distance = fish.bodyLength * progress;
        spineAt(fish, distance, point);
        const forwardX = Math.cos(point.a);
        const forwardY = Math.sin(point.a);
        const normalX = -Math.sin(point.a);
        const normalY = Math.cos(point.a);
        const rootWidth = bodyWidth(progress) * cellW * fish.scale;
        for (let side = -1; side <= 1; side += 2) {
          const reach = (pair === 0 ? 3.15 : 2.50) + beat * side * 0.20;
          for (let t = 0; t <= 1.001; t += 0.075) {
            const spread = side * (rootWidth * 0.64 + t * reach * cellW * fish.scale);
            const sweepCenter = t * (pair === 0 ? 1.75 : 1.35) * cellW;
            const halfChord = (1 - t) * (pair === 0 ? 1.45 : 1.10) * cellW;
            for (let sweep = -halfChord; sweep <= halfChord + 0.01; sweep += cellW * 0.30) {
              const along = sweepCenter + sweep;
              const x = point.x + normalX * spread + forwardX * along;
              const y = point.y + normalY * spread + forwardY * along;
              const column = Math.round(x / cellW);
              const row = Math.round(y / cellH);
              const noise = cellNoise(column, row, fish);
              const character = t > 0.78 ? (noise < 0.6 ? ':' : 'o') : (noise < 0.30 ? '0' : (noise < 0.82 ? 'o' : 'O'));
              const color = noise > 0.80 ? fish.palette[1] : fish.palette[3];
              putFish(column, row, character, color, 0.62 + (1 - t) * 0.20, fish, 2);
            }
          }
        }
      }
    }

    function drawBody(fish) {
      const step = Math.min(cellW, cellH) * 0.32;
      for (let distance = fish.bodyLength; distance >= 0; distance -= step) {
        const progress = distance / fish.bodyLength;
        spineAt(fish, distance, point);
        const centerColumn = Math.round(point.x / cellW);
        const centerRow = Math.round(point.y / cellH);
        const normalX = -Math.sin(point.a);
        const normalY = Math.cos(point.a);
        const halfWidth = bodyWidth(progress) * cellW * fish.scale;
        const radius = Math.ceil(halfWidth / Math.min(cellW, cellH)) + 1;
        for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
          for (let columnOffset = -radius; columnOffset <= radius; columnOffset++) {
            const column = centerColumn + columnOffset;
            const row = centerRow + rowOffset;
            const dx = column * cellW - point.x;
            const dy = row * cellH - point.y;
            const lateral = dx * normalX + dy * normalY;
            if (Math.abs(lateral) > halfWidth) continue;
            const edge = Math.abs(lateral) / Math.max(1, halfWidth);
            const noise = cellNoise(column, row, fish);
            const character = bodyCharacter(progress, edge, noise);
            const color = bodyColor(fish, progress, lateral / cellW, edge);
            putFish(column, row, character, color, 0.80 + (1 - edge) * 0.18, fish, 3);
          }
        }
      }
    }

    function drawFish(fish) {
      drawTail(fish);
      drawFins(fish);
      drawBody(fish);

      spineAt(fish, fish.bodyLength * 0.115, point);
      const normalX = -Math.sin(point.a);
      const normalY = Math.cos(point.a);
      for (let side = -1; side <= 1; side += 2) {
        const x = point.x + normalX * side * cellW * 1.28 * fish.scale;
        const y = point.y + normalY * side * cellW * 1.28 * fish.scale;
        putFish(Math.round(x / cellW), Math.round(y / cellH), '0', '#242724', 1, fish, 4);
      }
    }

    function addRipple(x, y, strength) {
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, age: 0, life: 2.5 + random(), strength: strength || 1 });
    }

    function drawRipples(dt) {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.age += dt;
        if (ripple.age >= ripple.life) {
          ripples.splice(i, 1);
          continue;
        }
        const progress = ripple.age / ripple.life;
        const radius = 8 + progress * Math.min(150, width * 0.18);
        const alpha = Math.sin(progress * Math.PI) * 0.25 * ripple.strength;
        const marks = 12 + Math.floor(progress * 10);
        for (let j = 0; j < marks; j++) {
          if ((j + Math.floor(ripple.age * 3)) % 3 === 0) continue;
          const angle = j / marks * TAU;
          const x = ripple.x + Math.cos(angle) * radius;
          const y = ripple.y + Math.sin(angle) * radius * 0.58;
          putWater(Math.round(x / cellW), Math.round(y / cellH), j % 2 ? '-' : '.', '#9aa8ad', alpha);
        }
      }
    }

    function drawWater() {
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      clearGrid();
      for (let i = 0; i < water.length; i++) {
        const mote = water[i];
        const wave = Math.sin(elapsed * mote.drift + mote.phase);
        const column = mote.column + Math.round(Math.sin(elapsed * 0.09 + mote.phase) * 0.65);
        const row = mote.row + Math.round(wave * 0.22);
        putWater(column, row, mote.glyph, '#929da2', 0.13 + mote.shade * 0.12 + wave * 0.02);
      }
    }

    function drawGrid() {
      ctx.shadowBlur = 0;
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column;
          if (!cells[index]) continue;
          ctx.globalAlpha = cellAlphas[index];
          ctx.fillStyle = cellColors[index];
          ctx.fillText(cells[index], column * cellW, row * cellH);
        }
      }
      ctx.globalAlpha = 1;
    }

    function draw(dt) {
      drawWater();
      drawRipples(dt || 0);
      for (let i = 0; i < fishes.length; i++) drawFish(fishes[i]);
      drawGrid();
    }

    function steer(fish, dt) {
      let targetTurn = Math.sin(elapsed * fish.wanderSpeed + fish.phase) * 0.24;
      targetTurn += Math.sin(elapsed * 0.17 + fish.phase * 2.1) * 0.12;
      const margin = Math.min(Math.max(52, fish.bodyLength), width * 0.23, height * 0.23);
      const left = (margin - fish.x) / margin;
      const right = (fish.x - (width - margin)) / margin;
      const top = (margin - fish.y) / margin;
      const bottom = (fish.y - (height - margin)) / margin;
      let avoidX = 0;
      let avoidY = 0;
      if (left > 0) avoidX += left * left * 2.2;
      if (right > 0) avoidX -= right * right * 2.2;
      if (top > 0) avoidY += top * top * 2.2;
      if (bottom > 0) avoidY -= bottom * bottom * 2.2;

      for (let i = 0; i < fishes.length; i++) {
        const other = fishes[i];
        if (other === fish) continue;
        const dx = fish.x - other.x;
        const dy = fish.y - other.y;
        const distanceSquared = dx * dx + dy * dy;
        const range = (fish.bodyLength + other.bodyLength) * 0.65;
        if (distanceSquared > 1 && distanceSquared < range * range) {
          const distance = Math.sqrt(distanceSquared);
          const force = (1 - distance / range) * 1.8;
          avoidX += dx / distance * force;
          avoidY += dy / distance * force;
        }
      }

      if (avoidX !== 0 || avoidY !== 0) {
        const desired = Math.atan2(avoidY, avoidX);
        const difference = angleDelta(desired, fish.heading);
        const strength = Math.min(1.7, Math.sqrt(avoidX * avoidX + avoidY * avoidY));
        targetTurn += difference * strength;
      }
      targetTurn = Math.max(-1.35, Math.min(1.35, targetTurn));
      fish.turn += (targetTurn - fish.turn) * Math.min(1, dt * 2.7);
      fish.heading += fish.turn * dt;
      const speed = fish.speed * (0.94 + Math.sin(elapsed * 0.43 + fish.phase) * 0.08);
      fish.x += Math.cos(fish.heading) * speed * dt;
      fish.y += Math.sin(fish.heading) * speed * dt;
      recordPosition(fish);
    }

    function updateButton() {
      button.setAttribute('aria-pressed', String(paused));
      if (label) label.textContent = paused ? 'Resume motion' : 'Pause motion';
      if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
    }

    function setPaused(value) {
      paused = value;
      lastTime = 0;
      updateButton();
    }

    function animate(now) {
      requestAnimationFrame(animate);
      if (paused || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;
      for (let i = 0; i < fishes.length; i++) steer(fishes[i], dt);
      nextRipple -= dt;
      if (nextRipple <= 0) {
        addRipple(random() * width, random() * height, 0.45);
        nextRipple = 4 + random() * 6;
      }
      draw(dt);
      frame++;
    }

    button.addEventListener('click', () => {
      pausedByVisibility = false;
      setPaused(!paused);
    });

    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const target = event.target;
      if (target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"]')) return;
      addRipple(event.clientX, event.clientY, 1);
      if (paused) draw();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pausedByVisibility = !paused;
        if (!paused) setPaused(true);
      } else if (pausedByVisibility) {
        pausedByVisibility = false;
        setPaused(false);
      }
    });

    function motionPreferenceChanged(event) {
      pausedByVisibility = false;
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', motionPreferenceChanged);
    } else {
      motionQuery.addListener(motionPreferenceChanged);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.koiPond = {
      get paused() { return paused; },
      get fishCount() { return fishes.length; },
      get frame() { return frame; },
      get fontSize() { return fontSize; },
      get columns() { return columns; },
      get rows() { return rows; },
      get cellWidth() { return cellW; },
      get cellHeight() { return cellH; }
    };

    updateButton();
    resize();
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
