(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const HISTORY_SIZE = 240;
  const HISTORY_STEP = 2;
  const MAX_RIPPLES = 14;
  const MAX_TILT = Math.PI * 0.32;
  const MIN_ZOOM = 0.80;
  const MAX_ZOOM = 1.40;
  const BODY_PROFILE = [
    [0.00, 1.18], [0.06, 2.70], [0.16, 4.35], [0.30, 5.55],
    [0.46, 5.10], [0.62, 3.95], [0.78, 2.55], [0.91, 1.38], [1.00, 0.88]
  ];
  const PALETTES = [
    ['#41423e', '#b9653e', '#9f4437', '#77766e', '#d8d3c8', '#252824'],
    ['#55524b', '#bd7548', '#88463b', '#838078', '#ddd7cc', '#2c2c28'],
    ['#353936', '#a95738', '#b14b3c', '#6f716b', '#d5d0c5', '#222622'],
    ['#605b52', '#c07a48', '#9c5140', '#888278', '#dcd6ca', '#302f2a'],
    ['#484943', '#ad633f', '#913d34', '#7b796f', '#d8d1c5', '#282924'],
    ['#3d403d', '#bd7044', '#a64c3c', '#73766f', '#ded8cc', '#252825']
  ];

  function start() {
    const canvas = document.getElementById('pond');
    const button = document.getElementById('motion-toggle');
    const resetButton = document.getElementById('view-reset');
    if (!canvas || !button) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const label = button.querySelector('.control-label');
    const icon = button.querySelector('.control-icon');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const water = [];
    const ripples = [];
    const fishes = [];
    const pointers = new Map();
    const point = { x: 0, y: 0, a: 0 };
    const screenPoint = { x: 0, y: 0 };
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
    let uiMask = new Uint8Array(1);
    let background = null;
    let yaw = 0;
    let tilt = 0;
    let zoom = 1;
    let targetYaw = 0;
    let targetTilt = 0;
    let targetZoom = 1;
    let dragging = false;
    let activePointer = null;
    let gestureHadMultiple = false;
    let pinchDistance = 0;
    let pinchZoom = 1;
    let dragYawVelocity = 0;
    let dragTiltVelocity = 0;
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

    function clamp(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }

    function project(x, y, out) {
      if (yaw === 0 && tilt === 0 && zoom === 1) {
        out.x = x;
        out.y = y;
        return out;
      }
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const dx = x - centerX;
      const dy = y - centerY;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const rotatedX = dx * cosYaw - dy * sinYaw;
      const rotatedY = dx * sinYaw + dy * cosYaw;
      const distance = Math.max(width, height) * 1.35;
      const perspective = distance / (distance + rotatedY * Math.sin(tilt));
      out.x = centerX + rotatedX * perspective * zoom;
      out.y = centerY + rotatedY * Math.cos(tilt) * perspective * zoom;
      return out;
    }

    function unproject(x, y) {
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const screenX = (x - centerX) / zoom;
      const screenY = (y - centerY) / zoom;
      const distance = Math.max(width, height) * 1.35;
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);
      const denominator = cosTilt * distance - screenY * sinTilt;
      const rotatedY = screenY * distance / Math.max(1, denominator);
      const rotatedX = screenX * (distance + rotatedY * sinTilt) / distance;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      return {
        x: centerX + rotatedX * cosYaw + rotatedY * sinYaw,
        y: centerY - rotatedX * sinYaw + rotatedY * cosYaw
      };
    }

    function updateCamera(dt) {
      const blend = 1 - Math.exp(-dt * 11);
      const nextYaw = yaw + (targetYaw - yaw) * blend;
      const nextTilt = tilt + (targetTilt - tilt) * blend;
      const nextZoom = zoom + (targetZoom - zoom) * blend;
      const changed = Math.abs(nextYaw - yaw) + Math.abs(nextTilt - tilt) + Math.abs(nextZoom - zoom) > 0.000001;
      yaw = Math.abs(targetYaw - nextYaw) < 0.00001 ? targetYaw : nextYaw;
      tilt = Math.abs(targetTilt - nextTilt) < 0.00001 ? targetTilt : nextTilt;
      zoom = Math.abs(targetZoom - nextZoom) < 0.00001 ? targetZoom : nextZoom;
      return changed;
    }

    function resetCamera() {
      targetYaw = 0;
      targetTilt = 0;
      targetZoom = 1;
      dragYawVelocity = 0;
      dragTiltVelocity = 0;
    }

    function Fish(index) {
      this.index = index;
      this.x = 0;
      this.y = 0;
      this.heading = 0;
      this.turn = 0;
      this.scale = 0.90 + random() * 0.22;
      this.speed = 15 + random() * 8;
      this.phase = random() * TAU;
      this.wanderSpeed = 0.30 + random() * 0.28;
      this.pattern = index * 3 + Math.floor(random() * 3);
      this.palette = PALETTES[index % PALETTES.length];
      this.history = new Float32Array(HISTORY_SIZE * 3);
      this.head = 0;
      this.count = 0;
      this.bodyLength = 155;
      this.tailLength = 45;
    }

    function initializeFish(fish, x, y, heading) {
      fish.x = x;
      fish.y = y;
      fish.heading = heading;
      fish.turn = 0;
      fish.bodyLength = cellW * 30.5 * fish.scale;
      fish.tailLength = cellW * 9.0 * fish.scale;
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
      uiMask = new Uint8Array(size);
    }

    function maskInterface() {
      uiMask.fill(0);
      const elements = document.querySelectorAll('.site-header > *, .exhibit-caption, .site-footer > *');
      for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        const paddingX = cellW * 2;
        const paddingY = cellH;
        const left = Math.max(0, Math.floor((rect.left - paddingX) / cellW));
        const right = Math.min(columns - 1, Math.ceil((rect.right + paddingX) / cellW));
        const top = Math.max(0, Math.floor((rect.top - paddingY) / cellH));
        const bottom = Math.min(rows - 1, Math.ceil((rect.bottom + paddingY) / cellH));
        for (let row = top; row <= bottom; row++) {
          uiMask.fill(1, row * columns + left, row * columns + right + 1);
        }
      }
    }

    function clearGrid() {
      cells.fill(null);
      cellOwners.fill(-1);
      cellPriorities.fill(0);
    }

    function putCell(column, row, character, color, alpha, owner, priority) {
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      const index = row * columns + column;
      if (uiMask[index]) return;
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
          x: Math.floor(random() * columns) * cellW,
          y: Math.floor(random() * rows) * cellH,
          glyph: random() < 0.82 ? '.' : "'",
          phase: random() * TAU,
          drift: 0.12 + random() * 0.25,
          shade: random()
        });
      }
    }

    function desiredFishCount() {
      if (width < 600) return 3;
      if (width < 1000) return 5;
      return 6;
    }

    function silhouetteMargin(fish) {
      return cellW * 12 * fish.scale;
    }

    function reservedAt(x, y, margin) {
      if (x < margin || x > width - margin || y < 95 + margin + 30 || y > height - 95 - margin - 30) return true;
      const captionRight = (width < 600 ? 330 : 360) + margin + 36;
      const captionTop = height - (width < 600 ? 280 : 300) - margin - 36;
      return x < captionRight && y > captionTop;
    }

    function initialSilhouetteClear(fish, x, y, heading) {
      const margin = silhouetteMargin(fish);
      const totalLength = fish.bodyLength + fish.tailLength;
      for (let i = 0; i <= 12; i++) {
        const distance = totalLength * i / 12;
        const px = x - Math.cos(heading) * distance;
        const py = y - Math.sin(heading) * distance;
        if (reservedAt(px, py, margin)) return false;
      }
      for (let i = 0; i < fish.index; i++) {
        const other = fishes[i];
        const dx = x - other.x;
        const dy = y - other.y;
        const range = (totalLength + other.bodyLength + other.tailLength) * 0.40;
        if (dx * dx + dy * dy < range * range) return false;
      }
      return true;
    }

    function placeFish(fish, baseX, baseY, preferredHeading) {
      initializeFish(fish, baseX, baseY, preferredHeading);
      for (let attempt = 0; attempt < 180; attempt++) {
        let x = baseX;
        let y = baseY;
        let heading = preferredHeading;
        if (attempt > 0 && attempt < 36) {
          x += (random() - 0.5) * Math.min(150, width * 0.16);
          y += (random() - 0.5) * Math.min(130, height * 0.18);
          heading += (random() - 0.5) * 2.2;
        } else if (attempt >= 36) {
          x = random() * width;
          y = 95 + random() * Math.max(1, height - 190);
          heading = random() * TAU;
        }
        if (!initialSilhouetteClear(fish, x, y, heading)) continue;
        initializeFish(fish, x, y, heading);
        return;
      }
      initializeFish(fish, baseX, baseY, preferredHeading);
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
      maskInterface();
      background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#f7f5ef');
      background.addColorStop(0.48, '#f3f1eb');
      background.addColorStop(1, '#eeece5');
      populateWater();
      ripples.length = 0;

      const count = desiredFishCount();
      fishes.length = Math.min(fishes.length, count);
      while (fishes.length < count) fishes.push(new Fish(fishes.length));
      const phoneLayout = width < 600;
      const layoutColumns = phoneLayout ? 1 : 3;
      const layoutRows = Math.ceil(count / layoutColumns);
      const marginX = Math.min(width * 0.15, 105);
      const marginY = Math.min(height * 0.15, 105);
      const layoutTop = phoneLayout ? Math.min(80, height * 0.14) : marginY;
      const layoutHeight = phoneLayout ? height * 0.54 : height - marginY * 2;
      for (let i = 0; i < fishes.length; i++) {
        const column = i % layoutColumns;
        const row = Math.floor(i / layoutColumns);
        const x = marginX + (width - marginX * 2) * (column + 0.5) / layoutColumns;
        const y = layoutTop + layoutHeight * (row + 0.5) / layoutRows;
        const heading = phoneLayout ? (i % 2 ? Math.PI + 0.18 : -0.18) : random() * TAU;
        placeFish(fishes[i], x, y, heading);
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

    function bodyPatch(fish, progress, lateral) {
      if (progress < 0.14 && fish.pattern % 3 === 0) return 2;
      const broad = Math.sin(progress * 8.8 + fish.pattern * 1.37 + lateral * 0.28)
        + Math.sin(progress * 19 - lateral * 0.65 + fish.pattern * 0.63) * 0.38;
      const island = Math.cos(progress * 13.5 - fish.pattern * 0.91 + lateral * 0.52);
      if (island > 1.00 && progress > 0.12 && progress < 0.88) return 2;
      if (broad > 0.76) return 1;
      if (broad < -0.82) return 3;
      return fish.pattern % 4 === 1 ? 3 : 0;
    }

    function bodyCharacter(progress, edge, noise, patch) {
      if (edge > 0.94) return noise < 0.55 ? ':' : '.';
      if (edge > 0.80) return noise < 0.58 ? 'o' : ':';
      if (edge > 0.60) return noise < 0.24 ? '0' : (noise < 0.78 ? 'O' : 'o');
      if (progress < 0.15) return noise < 0.24 ? '0' : (noise < 0.78 ? 'O' : '@');
      if (patch === 3) return noise < 0.20 ? 'o' : (noise < 0.78 ? 'O' : '0');
      if (patch === 1 || patch === 2) {
        if (noise < 0.16) return '@';
        if (noise < 0.47) return '0';
        return noise < 0.88 ? 'O' : 'o';
      }
      if (noise < 0.13) return '#';
      if (noise < 0.38) return '@';
      if (noise < 0.61) return '0';
      return noise < 0.90 ? 'O' : 'o';
    }

    function bodyColor(fish, patch, edge) {
      if (patch === 1) return fish.palette[1];
      if (patch === 2) return fish.palette[2];
      if (patch === 3) return edge > 0.66 ? fish.palette[3] : fish.palette[4];
      return edge > 0.80 ? fish.palette[3] : fish.palette[0];
    }

    function drawTail(fish) {
      const wag = Math.sin(elapsed * 3.1 + fish.phase) * 0.85;
      const steps = Math.ceil(fish.tailLength / Math.max(1, cellW * 0.26));
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        spineAt(fish, fish.bodyLength + progress * fish.tailLength, point);
        const normalX = -Math.sin(point.a);
        const normalY = Math.cos(point.a);
        const halfWidth = (0.80 + Math.sin(progress * Math.PI * 0.5) * 7.0) * cellW * fish.scale;
        const notch = Math.max(0, (progress - 0.55) / 0.45) * 4.50 * cellW * fish.scale;
        const radius = Math.ceil(halfWidth / Math.min(cellW, cellH)) + 1;
        const centerColumn = Math.round(point.x / cellW);
        const centerRow = Math.round(point.y / cellH);
        for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
          for (let columnOffset = -radius; columnOffset <= radius; columnOffset++) {
            const worldColumn = centerColumn + columnOffset;
            const worldRow = centerRow + rowOffset;
            const dx = worldColumn * cellW - point.x;
            const dy = worldRow * cellH - point.y;
            const lateral = dx * normalX + dy * normalY - wag * progress * cellW;
            const along = dx * Math.cos(point.a) + dy * Math.sin(point.a);
            const distanceFromCenter = Math.abs(lateral);
            if (Math.abs(along) > Math.max(cellW, cellH) * 0.55) continue;
            if (distanceFromCenter > halfWidth || distanceFromCenter < notch) continue;
            const edge = distanceFromCenter / Math.max(1, halfWidth);
            project(worldColumn * cellW, worldRow * cellH, screenPoint);
            const column = Math.round(screenPoint.x / cellW);
            const row = Math.round(screenPoint.y / cellH);
            const noise = cellNoise(column, row, fish);
            const angle = Math.atan2(lateral, progress * fish.tailLength + cellW);
            const ray = Math.abs(Math.sin(angle * 30));
            let character = noise < 0.38 ? '0' : (noise < 0.90 ? 'O' : 'o');
            if (ray > 0.96) character = ':';
            if (edge > 0.93) character = noise < 0.65 ? ':' : '.';
            const color = progress < 0.24 ? fish.palette[1]
              : (ray > 0.96 ? fish.palette[0] : (fish.pattern % 2 ? fish.palette[4] : fish.palette[3]));
            putFish(column, row, character, color, 0.72 + (1 - progress) * 0.22, fish, 1);
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
          const reach = (pair === 0 ? 6.0 : 4.60) + beat * side * 0.28;
          for (let t = 0; t <= 1.001; t += 0.05) {
            const spread = side * (rootWidth * 0.62 + t * reach * cellW * fish.scale);
            const sweepCenter = t * (pair === 0 ? 3.0 : 2.30) * cellW;
            const halfChord = (1 - t) * (pair === 0 ? 2.50 : 1.90) * cellW;
            for (let sweep = -halfChord; sweep <= halfChord + 0.01; sweep += cellW * 0.25) {
              const along = sweepCenter + sweep;
              const x = point.x + normalX * spread + forwardX * along;
              const y = point.y + normalY * spread + forwardY * along;
              project(x, y, screenPoint);
              const column = Math.round(screenPoint.x / cellW);
              const row = Math.round(screenPoint.y / cellH);
              const noise = cellNoise(column, row, fish);
              const ray = Math.abs(Math.sin(sweep / cellW * 3.4 + t * 4));
              let character = noise < 0.35 ? '0' : (noise < 0.90 ? 'O' : 'o');
              if (ray > 0.95) character = ':';
              if (t > 0.90) character = noise < 0.6 ? ':' : 'o';
              const color = t < 0.26 && noise > 0.48 ? fish.palette[1]
                : (ray > 0.95 ? fish.palette[0] : (fish.pattern % 2 ? fish.palette[4] : fish.palette[3]));
              putFish(column, row, character, color, 0.72 + (1 - t) * 0.22, fish, 2);
            }
          }
        }
      }
    }

    function drawBody(fish) {
      const step = Math.min(cellW, cellH) * 0.28;
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
            const worldColumn = centerColumn + columnOffset;
            const worldRow = centerRow + rowOffset;
            const dx = worldColumn * cellW - point.x;
            const dy = worldRow * cellH - point.y;
            const lateral = dx * normalX + dy * normalY;
            const along = dx * Math.cos(point.a) + dy * Math.sin(point.a);
            if (Math.abs(along) > Math.max(cellW, cellH) * 0.55) continue;
            if (Math.abs(lateral) > halfWidth) continue;
            const edge = Math.abs(lateral) / Math.max(1, halfWidth);
            project(worldColumn * cellW, worldRow * cellH, screenPoint);
            const column = Math.round(screenPoint.x / cellW);
            const row = Math.round(screenPoint.y / cellH);
            const noise = cellNoise(column, row, fish);
            const patch = bodyPatch(fish, progress, lateral / cellW);
            const character = bodyCharacter(progress, edge, noise, patch);
            const color = bodyColor(fish, patch, edge);
            putFish(column, row, character, color, 0.82 + (1 - edge) * 0.16, fish, 3);
          }
        }
      }
    }

    function drawFish(fish) {
      drawTail(fish);
      drawFins(fish);
      drawBody(fish);

      spineAt(fish, fish.bodyLength * 0.105, point);
      const normalX = -Math.sin(point.a);
      const normalY = Math.cos(point.a);
      for (let side = -1; side <= 1; side += 2) {
        const x = point.x + normalX * side * cellW * 2.12 * fish.scale;
        const y = point.y + normalY * side * cellW * 2.12 * fish.scale;
        project(x, y, screenPoint);
        putFish(Math.round(screenPoint.x / cellW), Math.round(screenPoint.y / cellH), '0', fish.palette[5], 1, fish, 5);
      }

      spineAt(fish, fish.bodyLength * 0.025, point);
      project(point.x, point.y, screenPoint);
      putFish(Math.round(screenPoint.x / cellW), Math.round(screenPoint.y / cellH), 'O', fish.palette[3], 0.96, fish, 4);
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
          project(x, y, screenPoint);
          putWater(Math.round(screenPoint.x / cellW), Math.round(screenPoint.y / cellH), j % 2 ? '-' : '.', '#9aa8ad', alpha);
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
        const x = mote.x + Math.round(Math.sin(elapsed * 0.09 + mote.phase) * 0.65) * cellW;
        const y = mote.y + Math.round(wave * 0.22) * cellH;
        project(x, y, screenPoint);
        putWater(Math.round(screenPoint.x / cellW), Math.round(screenPoint.y / cellH), mote.glyph, '#929da2', 0.13 + mote.shade * 0.12 + wave * 0.02);
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

    function addEnvironmentAvoidance(fish, x, y, weight, avoid) {
      const margin = silhouetteMargin(fish);
      const influence = 54;
      const span = influence * 2;
      const top = 95 + margin + 30;
      const bottom = height - 95 - margin - 30;
      const right = width - margin;
      const topForce = Math.max(0, Math.min(1, (top + influence - y) / span));
      const bottomForce = Math.max(0, Math.min(1, (y - bottom + influence) / span));
      const leftForce = Math.max(0, Math.min(1, (margin + influence - x) / span));
      const rightForce = Math.max(0, Math.min(1, (x - right + influence) / span));
      avoid.x += (leftForce - rightForce) * weight * 3.4;
      avoid.y += (topForce - bottomForce) * weight * 3.4;

      const captionRight = (width < 600 ? 330 : 360) + margin + 36;
      const captionTop = height - (width < 600 ? 280 : 300) - margin - 36;
      const captionX = Math.max(0, Math.min(1, (captionRight + influence - x) / span));
      const captionY = Math.max(0, Math.min(1, (y - captionTop + influence) / span));
      if (captionX > 0 && captionY > 0) {
        avoid.x += captionX * (0.45 + captionY) * weight * 3.0;
        avoid.y -= captionY * (0.45 + captionX) * weight * 3.0;
      }
    }

    function steer(fish, dt) {
      let targetTurn = Math.sin(elapsed * fish.wanderSpeed + fish.phase) * 0.24;
      targetTurn += Math.sin(elapsed * 0.17 + fish.phase * 2.1) * 0.12;
      const totalLength = fish.bodyLength + fish.tailLength;
      const avoid = { x: 0, y: 0 };
      for (let i = 0; i <= 10; i++) {
        spineAt(fish, totalLength * i / 10, point);
        addEnvironmentAvoidance(fish, point.x, point.y, i === 0 ? 1.2 : 0.58, avoid);
      }
      spineAt(fish, 0, point);
      const lookAhead = totalLength * 0.90;
      addEnvironmentAvoidance(
        fish,
        point.x + Math.cos(fish.heading) * lookAhead,
        point.y + Math.sin(fish.heading) * lookAhead,
        1.5,
        avoid
      );

      for (let i = 0; i < fishes.length; i++) {
        const other = fishes[i];
        if (other === fish) continue;
        const dx = fish.x - other.x;
        const dy = fish.y - other.y;
        const distanceSquared = dx * dx + dy * dy;
        const range = (totalLength + other.bodyLength + other.tailLength) * 0.62;
        if (distanceSquared > 1 && distanceSquared < range * range) {
          const distance = Math.sqrt(distanceSquared);
          const force = (1 - distance / range) * 2.8;
          avoid.x += dx / distance * force;
          avoid.y += dy / distance * force;
        }
      }

      if (avoid.x !== 0 || avoid.y !== 0) {
        const desired = Math.atan2(avoid.y, avoid.x);
        const difference = angleDelta(desired, fish.heading);
        const strength = Math.min(2.4, Math.sqrt(avoid.x * avoid.x + avoid.y * avoid.y));
        targetTurn += difference * strength;
      }
      targetTurn = Math.max(-1.25, Math.min(1.25, targetTurn));
      fish.turn += (targetTurn - fish.turn) * Math.min(1, dt * 2.1);
      fish.heading += fish.turn * dt;
      const speed = fish.speed * (0.94 + Math.sin(elapsed * 0.43 + fish.phase) * 0.08);
      fish.x += Math.cos(fish.heading) * speed * dt;
      fish.y += Math.sin(fish.heading) * speed * dt;
      recordPosition(fish);
    }

    function updateButton() {
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
      if (document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const cameraChanged = updateCamera(dt);
      if (paused) {
        if (cameraChanged) draw();
        return;
      }
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

    function isInterfaceTarget(target) {
      return target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]');
    }

    function releaseCapture(pointerId) {
      try {
        if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      } catch (error) {
        return;
      }
    }

    function rebaseGesture(timeStamp) {
      if (!pointers.has(activePointer)) activePointer = pointers.keys().next().value;
      for (const pointer of pointers.values()) {
        pointer.startX = pointer.x;
        pointer.startY = pointer.y;
        pointer.lastDx = 0;
        pointer.lastDy = 0;
        pointer.time = timeStamp;
      }
      dragYawVelocity = 0;
      dragTiltVelocity = 0;
      if (pointers.size >= 2) {
        const ids = Array.from(pointers.keys());
        const first = pointers.get(ids[0]);
        const second = pointers.get(ids[1]);
        pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
      } else {
        pinchDistance = 0;
      }
      pinchZoom = targetZoom;
    }

    function endGesture(applyInertia) {
      if (applyInertia && dragging) {
        targetYaw += clamp(dragYawVelocity * 0.12, -0.75, 0.75);
        targetTilt = clamp(targetTilt + clamp(dragTiltVelocity * 0.10, -0.3, 0.3), 0, MAX_TILT);
      }
      dragging = false;
      activePointer = null;
      dragYawVelocity = 0;
      dragTiltVelocity = 0;
      document.body.style.cursor = 'grab';
    }

    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || isInterfaceTarget(event.target)) return;
      event.preventDefault();
      const focused = document.activeElement;
      if (isInterfaceTarget(focused) && typeof focused.blur === 'function') focused.blur();
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        return;
      }
      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        time: event.timeStamp,
        moved: false,
        type: event.pointerType
      });
      if (pointers.size === 1) {
        activePointer = event.pointerId;
        gestureHadMultiple = false;
      } else {
        gestureHadMultiple = true;
        dragging = true;
        for (const pointer of pointers.values()) pointer.moved = true;
      }
      rebaseGesture(event.timeStamp);
    }, { passive: false });

    window.addEventListener('pointermove', (event) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      event.preventDefault();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pointers.size >= 2) {
        const ids = Array.from(pointers.keys());
        const first = pointers.get(ids[0]);
        const second = pointers.get(ids[1]);
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinchDistance > 0) targetZoom = clamp(pinchZoom * distance / pinchDistance, MIN_ZOOM, MAX_ZOOM);
        return;
      }
      if (event.pointerId !== activePointer) return;
      const dx = event.clientX - pointer.startX - (pointer.lastDx || 0);
      const dy = event.clientY - pointer.startY - (pointer.lastDy || 0);
      const totalDistance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
      const threshold = pointer.type === 'touch' ? 8 : 5;
      if (!pointer.moved && totalDistance < threshold) return;
      pointer.moved = true;
      pointer.lastDx = event.clientX - pointer.startX;
      pointer.lastDy = event.clientY - pointer.startY;
      dragging = true;
      document.body.style.cursor = 'grabbing';
      targetYaw += dx * 0.008;
      targetTilt = clamp(targetTilt + dy * 0.006, 0, MAX_TILT);
      const dt = Math.max(0.008, (event.timeStamp - pointer.time) / 1000);
      dragYawVelocity = dragYawVelocity * 0.35 + dx * 0.008 / dt * 0.65;
      dragTiltVelocity = dragTiltVelocity * 0.35 + dy * 0.006 / dt * 0.65;
      pointer.time = event.timeStamp;
    }, { passive: false });

    window.addEventListener('pointerup', (event) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const wasClick = pointers.size === 1 && !pointer.moved && !gestureHadMultiple;
      pointers.delete(event.pointerId);
      releaseCapture(event.pointerId);
      if (wasClick) {
        const position = unproject(event.clientX, event.clientY);
        addRipple(position.x, position.y, 1);
        if (paused) draw();
      }
      if (pointers.size === 0) {
        endGesture(!wasClick);
        gestureHadMultiple = false;
      } else {
        rebaseGesture(event.timeStamp);
        dragging = pointers.size >= 2;
        document.body.style.cursor = dragging ? 'grabbing' : 'grab';
      }
    });

    window.addEventListener('pointercancel', (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      releaseCapture(event.pointerId);
      if (pointers.size === 0) {
        endGesture(false);
        gestureHadMultiple = false;
      } else {
        rebaseGesture(event.timeStamp);
        dragging = pointers.size >= 2;
        document.body.style.cursor = dragging ? 'grabbing' : 'grab';
      }
    });

    window.addEventListener('wheel', (event) => {
      if (isInterfaceTarget(event.target)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? height : 1);
      targetZoom = clamp(targetZoom * Math.exp(-event.deltaY * unit * 0.001), MIN_ZOOM, MAX_ZOOM);
    }, { passive: false });

    window.addEventListener('dblclick', (event) => {
      if (isInterfaceTarget(event.target)) return;
      event.preventDefault();
      resetCamera();
    });

    window.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isInterfaceTarget(event.target)) return;
      let handled = true;
      if (event.key === 'ArrowLeft') targetYaw -= 0.12;
      else if (event.key === 'ArrowRight') targetYaw += 0.12;
      else if (event.key === 'ArrowUp') targetTilt = clamp(targetTilt - 0.08, 0, MAX_TILT);
      else if (event.key === 'ArrowDown') targetTilt = clamp(targetTilt + 0.08, 0, MAX_TILT);
      else if (event.key === '+' || event.key === '=') targetZoom = clamp(targetZoom + 0.08, MIN_ZOOM, MAX_ZOOM);
      else if (event.key === '-' || event.key === '_') targetZoom = clamp(targetZoom - 0.08, MIN_ZOOM, MAX_ZOOM);
      else if (event.key === 'r' || event.key === 'R') resetCamera();
      else handled = false;
      if (handled) event.preventDefault();
    });

    if (resetButton) resetButton.addEventListener('click', resetCamera);
    canvas.style.touchAction = 'none';
    document.body.style.touchAction = 'none';
    document.body.style.cursor = 'grab';

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
      get cellHeight() { return cellH; },
      get rippleCount() { return ripples.length; },
      get yaw() { return yaw; },
      get tilt() { return tilt; },
      get pitch() { return tilt; },
      get zoom() { return zoom; },
      get dragging() { return dragging; },
      get camera() {
        return {
          yaw,
          tilt,
          pitch: tilt,
          zoom,
          dragging,
          targetYaw,
          targetTilt,
          targetZoom
        };
      }
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
