(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const U_SEGMENTS = 192;
  const V_SEGMENTS = 96;
  const FORM_NAMES = ['Orb', 'Torus', 'Block'];
  const SHADE_GLYPHS = ['=', '+', 'o', 'O', '0', '8', '&', '%', '#', '@'];
  const DEFAULT_YAW = -0.48;
  const DEFAULT_PITCH = -0.32;
  const MIN_ZOOM = 0.65;
  const DEFAULT_ZOOM = MIN_ZOOM;
  const MAX_PITCH = 1.20;
  const MORPH_DURATION = 5.8;
  const HOLD_DURATION = 2.4;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function orbSurface(u, v, out) {
    const phi = v * Math.PI;
    const ring = Math.sin(phi) * 1.18;
    out[0] = ring * Math.cos(u);
    out[1] = Math.cos(phi) * 1.18;
    out[2] = ring * Math.sin(u);
  }

  function torusSurface(u, v, out) {
    const phi = v * TAU;
    const ring = 0.92 + Math.cos(phi) * 0.47;
    out[0] = ring * Math.cos(u);
    out[1] = ring * Math.sin(u);
    out[2] = Math.sin(phi) * 0.47;
  }

  function blockSurface(u, v, out) {
    const phi = v * Math.PI;
    const ring = Math.sin(phi);
    const x = ring * Math.cos(u);
    const y = Math.cos(phi);
    const z = ring * Math.sin(u);
    const maximum = Math.max(Math.abs(x), Math.abs(y), Math.abs(z), 0.0001);
    const scale = (0.15 + 0.85 / maximum) * 0.94;
    out[0] = x * scale;
    out[1] = y * scale;
    out[2] = z * scale;
  }

  function buildForm(name, surface) {
    const stride = U_SEGMENTS + 1;
    const count = stride * (V_SEGMENTS + 1);
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const position = [0, 0, 0];
    const uBefore = [0, 0, 0];
    const uAfter = [0, 0, 0];
    const vBefore = [0, 0, 0];
    const vAfter = [0, 0, 0];
    for (let row = 0; row <= V_SEGMENTS; row++) {
      const v = row / V_SEGMENTS;
      for (let column = 0; column <= U_SEGMENTS; column++) {
        const u = column / U_SEGMENTS * TAU;
        const index = row * stride + column;
        const offset = index * 3;
        surface(u, v, position);
        surface(u - 0.0005, v, uBefore);
        surface(u + 0.0005, v, uAfter);
        surface(u, clamp(v - 0.0005, 0, 1), vBefore);
        surface(u, clamp(v + 0.0005, 0, 1), vAfter);
        const tangentUX = uAfter[0] - uBefore[0];
        const tangentUY = uAfter[1] - uBefore[1];
        const tangentUZ = uAfter[2] - uBefore[2];
        const tangentVX = vAfter[0] - vBefore[0];
        const tangentVY = vAfter[1] - vBefore[1];
        const tangentVZ = vAfter[2] - vBefore[2];
        let nx = tangentUY * tangentVZ - tangentUZ * tangentVY;
        let ny = tangentUZ * tangentVX - tangentUX * tangentVZ;
        let nz = tangentUX * tangentVY - tangentUY * tangentVX;
        let length = Math.hypot(nx, ny, nz);
        if (length < 0.000001) {
          nx = position[0];
          ny = position[1];
          nz = position[2];
          length = Math.hypot(nx, ny, nz) || 1;
        }
        positions[offset] = position[0];
        positions[offset + 1] = position[1];
        positions[offset + 2] = position[2];
        normals[offset] = nx / length;
        normals[offset + 1] = ny / length;
        normals[offset + 2] = nz / length;
      }
    }
    return { name, positions, normals };
  }

  function start() {
    const canvas = document.getElementById('sculpture-canvas');
    const caption = document.getElementById('sculpture-caption');
    const formLabel = document.getElementById('sculpture-form');
    const button = document.getElementById('motion-toggle');
    const resetButton = document.getElementById('view-reset');
    const morphButton = document.getElementById('morph-toggle');
    const gallery = window.frontendGallery;
    if (!canvas || !caption || !button || !gallery) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const label = button.querySelector('.control-label');
    const icon = button.querySelector('.control-icon');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const addWindowListener = window.addEventListener.bind(window);
    const formSurfaces = [
      buildForm('Orb', orbSurface),
      buildForm('Torus', torusSurface),
      buildForm('Block', blockSurface)
    ];
    const morphedPositions = new Float32Array(formSurfaces[0].positions.length);
    const morphedNormals = new Float32Array(formSurfaces[0].normals.length);
    const mixedGeometry = { positions: morphedPositions, normals: morphedNormals };
    const projected = {};
    const pointers = new Map();

    let width = 0;
    let height = 0;
    let dpr = 1;
    let fontSize = 9;
    let cellW = 1;
    let cellH = 1;
    let columns = 1;
    let rows = 1;
    let raster = null;
    let uiMask = null;
    let background = null;
    let viewport = null;
    let yaw = DEFAULT_YAW;
    let pitch = DEFAULT_PITCH;
    let targetYaw = DEFAULT_YAW;
    let targetPitch = DEFAULT_PITCH;
    let dragging = false;
    let activePointer = null;
    let paused = motionQuery.matches;
    let frame = 0;
    let lastTime = 0;
    let currentForm = 0;
    let morphFrom = 0;
    let morphTo = 0;
    let morphProgress = 1;
    let morphing = false;
    let morphAutomatic = false;
    let morphHold = 0;
    let animationRequest = null;

    function isActive() {
      return gallery.is('sculpture');
    }

    function canAnimate() {
      return isActive() && !document.hidden && !paused;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function projectPoint(x, y, z, camera, view, out) {
      const result = out || {};
      const cosYaw = Math.cos(camera.yaw);
      const sinYaw = Math.sin(camera.yaw);
      const cosPitch = Math.cos(camera.pitch);
      const sinPitch = Math.sin(camera.pitch);
      const rotatedX = x * cosYaw + z * sinYaw;
      const yawZ = -x * sinYaw + z * cosYaw;
      const rotatedY = y * cosPitch - yawZ * sinPitch;
      const rotatedZ = y * sinPitch + yawZ * cosPitch;
      const depth = Math.max(0.1, camera.distance - rotatedZ);
      const perspective = camera.distance / depth * camera.zoom;
      result.x = view.centerX + rotatedX * view.scale * perspective;
      result.y = view.centerY - rotatedY * view.scale * perspective;
      result.depth = depth;
      return result;
    }

    function createRaster(nextColumns, nextRows) {
      const size = nextColumns * nextRows;
      const depth = new Float32Array(size);
      depth.fill(Infinity);
      return {
        columns: nextColumns,
        rows: nextRows,
        depth,
        glyphs: new Array(size).fill(''),
        tones: new Float32Array(size),
        mask: null,
        occupied: 0
      };
    }

    function compositeSample(target, column, row, depth, glyph, tone) {
      if (column < 0 || column >= target.columns || row < 0 || row >= target.rows || !Number.isFinite(depth)) return false;
      const index = row * target.columns + column;
      if ((target.mask && target.mask[index]) || depth >= target.depth[index]) return false;
      if (target.depth[index] === Infinity) target.occupied++;
      target.depth[index] = depth;
      target.glyphs[index] = glyph;
      target.tones[index] = tone;
      return true;
    }

    function mixForms(fromIndex, toIndex, progress) {
      const from = formSurfaces[fromIndex];
      const to = formSurfaces[toIndex];
      const mix = clamp(progress, 0, 1);
      for (let offset = 0; offset < morphedPositions.length; offset += 3) {
        morphedPositions[offset] = from.positions[offset] + (to.positions[offset] - from.positions[offset]) * mix;
        morphedPositions[offset + 1] = from.positions[offset + 1] + (to.positions[offset + 1] - from.positions[offset + 1]) * mix;
        morphedPositions[offset + 2] = from.positions[offset + 2] + (to.positions[offset + 2] - from.positions[offset + 2]) * mix;
        let nx = from.normals[offset] + (to.normals[offset] - from.normals[offset]) * mix;
        let ny = from.normals[offset + 1] + (to.normals[offset + 1] - from.normals[offset + 1]) * mix;
        let nz = from.normals[offset + 2] + (to.normals[offset + 2] - from.normals[offset + 2]) * mix;
        const length = Math.hypot(nx, ny, nz);
        if (length < 0.000001) {
          nx = from.normals[offset];
          ny = from.normals[offset + 1];
          nz = from.normals[offset + 2];
        } else {
          nx /= length;
          ny /= length;
          nz /= length;
        }
        morphedNormals[offset] = nx;
        morphedNormals[offset + 1] = ny;
        morphedNormals[offset + 2] = nz;
      }
      return mixedGeometry;
    }

    function maskInterface() {
      if (!uiMask) return;
      uiMask.fill(0);
      const elements = document.querySelectorAll('.site-header > *, #sculpture-caption, .site-footer > *');
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
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

    function draw() {
      if (!raster || !viewport || !background) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      raster.depth.fill(Infinity);
      raster.glyphs.fill('');
      raster.tones.fill(0);
      raster.occupied = 0;
      const eased = morphProgress * morphProgress * (3 - 2 * morphProgress);
      const geometry = morphing ? mixForms(morphFrom, morphTo, eased) : formSurfaces[currentForm];
      const camera = { yaw, pitch, zoom: DEFAULT_ZOOM, distance: 6 };
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      for (let offset = 0; offset < geometry.positions.length; offset += 3) {
        projectPoint(
          geometry.positions[offset],
          geometry.positions[offset + 1],
          geometry.positions[offset + 2],
          camera,
          viewport,
          projected
        );
        const nx = geometry.normals[offset];
        const ny = geometry.normals[offset + 1];
        const nz = geometry.normals[offset + 2];
        const rotatedNX = nx * cosYaw + nz * sinYaw;
        const yawNZ = -nx * sinYaw + nz * cosYaw;
        const rotatedNY = ny * cosPitch - yawNZ * sinPitch;
        const rotatedNZ = ny * sinPitch + yawNZ * cosPitch;
        const diffuse = Math.max(0, rotatedNX * -0.46 + rotatedNY * 0.68 + rotatedNZ * 0.57);
        const rim = Math.pow(1 - Math.min(1, Math.abs(rotatedNZ)), 3) * 0.08;
        const light = clamp(0.16 + diffuse * 0.84 + rim, 0, 1);
        const tone = 1 - light;
        const glyph = SHADE_GLYPHS[Math.min(SHADE_GLYPHS.length - 1, Math.floor(tone * SHADE_GLYPHS.length))];
        compositeSample(
          raster,
          Math.round(projected.x / cellW),
          Math.round(projected.y / cellH),
          projected.depth,
          glyph,
          tone
        );
      }
      ctx.fillStyle = '#3d3932';
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column;
          const glyph = raster.glyphs[index];
          if (!glyph) continue;
          ctx.globalAlpha = 0.48 + raster.tones[index] * 0.44;
          ctx.fillText(glyph, column * cellW, row * cellH);
        }
      }
      ctx.globalAlpha = 1;
      frame++;
    }

    function refreshBackingStore(nextDpr) {
      dpr = nextDpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontSize + 'px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      draw();
    }

    function resize() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      fontSize = width < 600 ? 8 : (width < 1100 ? 9 : 10);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontSize + 'px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      cellW = Math.max(4, Math.ceil(ctx.measureText('M').width));
      cellH = cellW;
      columns = Math.ceil(width / cellW);
      rows = Math.ceil(height / cellH);
      raster = createRaster(columns, rows);
      uiMask = new Uint8Array(columns * rows);
      raster.mask = uiMask;
      const scale = Math.min(width, height) * (width < 700 ? 0.26 : 0.23);
      viewport = {
        width,
        height,
        scale,
        centerX: width * (width >= 800 ? 0.61 : 0.54),
        centerY: height * (width < 700 ? 0.42 : 0.47)
      };
      background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#f8f5ee');
      background.addColorStop(0.55, '#f4f0e7');
      background.addColorStop(1, '#eee9df');
      maskInterface();
      draw();
    }

    function updateCamera(dt) {
      const blend = 1 - Math.exp(-dt * 12);
      const nextYaw = yaw + (targetYaw - yaw) * blend;
      const nextPitch = pitch + (targetPitch - pitch) * blend;
      yaw = Math.abs(targetYaw - nextYaw) < 0.00001 ? targetYaw : nextYaw;
      pitch = Math.abs(targetPitch - nextPitch) < 0.00001 ? targetPitch : nextPitch;
    }

    function renderPausedCamera() {
      if (!paused) return;
      const changed = yaw !== targetYaw || pitch !== targetPitch;
      yaw = targetYaw;
      pitch = targetPitch;
      if (changed) draw();
    }

    function resetCamera() {
      targetYaw = DEFAULT_YAW;
      targetPitch = DEFAULT_PITCH;
      renderPausedCamera();
    }

    function updateFormLabel() {
      const animatedTransition = morphing && !paused && !motionQuery.matches;
      if (formLabel) {
        formLabel.textContent = morphing
          ? FORM_NAMES[morphFrom] + ' → ' + FORM_NAMES[morphTo]
          : String(currentForm + 1).padStart(2, '0') + ' / ' + FORM_NAMES[currentForm];
      }
      if (morphButton) {
        const morphLabel = morphButton.querySelector('.control-label');
        morphButton.disabled = animatedTransition;
        if (morphLabel) morphLabel.textContent = animatedTransition ? 'Morphing' : 'Morph';
        if (animatedTransition) {
          const transition = 'Morphing ' + FORM_NAMES[morphFrom] + ' to ' + FORM_NAMES[morphTo];
          morphButton.setAttribute('aria-label', transition);
          morphButton.title = transition;
        } else {
          const next = ((morphing ? morphTo : currentForm) + 1) % FORM_NAMES.length;
          morphButton.setAttribute('aria-label', 'Morph to ' + FORM_NAMES[next]);
          morphButton.title = 'Morph to ' + FORM_NAMES[next] + ' (M)';
        }
      }
    }

    function completeMorph() {
      currentForm = morphTo;
      morphFrom = currentForm;
      morphTo = currentForm;
      morphProgress = 1;
      morphing = false;
      morphAutomatic = false;
      morphHold = 0;
      updateFormLabel();
    }

    function beginMorph(automatic = false) {
      const staticStep = paused || motionQuery.matches;
      if (morphing) {
        if (!automatic && staticStep) {
          completeMorph();
          beginMorph();
        }
        return;
      }
      morphFrom = currentForm;
      morphTo = (currentForm + 1) % FORM_NAMES.length;
      morphProgress = 0;
      morphing = true;
      morphAutomatic = automatic;
      morphHold = 0;
      if (staticStep) {
        completeMorph();
        draw();
      } else {
        updateFormLabel();
      }
    }

    function updateMorph(dt) {
      if (morphing) {
        morphProgress = Math.min(1, morphProgress + dt / MORPH_DURATION);
        if (morphProgress >= 1) completeMorph();
      } else {
        morphHold += dt;
        if (morphHold >= HOLD_DURATION) beginMorph(true);
      }
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
      updateFormLabel();
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
      if (!dragging) targetYaw += dt * 0.075;
      updateCamera(dt);
      updateMorph(dt);
      draw();
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

    function isEditableTarget(target) {
      return target instanceof Element && target.closest('input, select, textarea, [role="textbox"], [contenteditable="true"]');
    }

    function releaseCapture(pointerId) {
      try {
        if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      } catch (error) {
        return;
      }
    }

    function rebaseGesture() {
      if (!pointers.has(activePointer)) activePointer = pointers.keys().next().value;
    }

    function endGesture() {
      dragging = false;
      activePointer = null;
      document.body.style.cursor = 'grab';
    }

    listenActive('pointerdown', (event) => {
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
        moved: false,
        type: event.pointerType
      });
      if (pointers.size === 1) activePointer = event.pointerId;
      else dragging = true;
      rebaseGesture();
    }, { passive: false });

    listenActive('pointermove', (event) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      event.preventDefault();
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pointers.size >= 2) return;
      if (event.pointerId !== activePointer) return;
      const totalDistance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
      const threshold = pointer.type === 'touch' ? 8 : 5;
      if (!pointer.moved && totalDistance < threshold) return;
      pointer.moved = true;
      dragging = true;
      document.body.style.cursor = 'grabbing';
      targetYaw += dx * 0.008;
      targetPitch = clamp(targetPitch + dy * 0.006, -MAX_PITCH, MAX_PITCH);
      renderPausedCamera();
    }, { passive: false });

    function finishPointer(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      releaseCapture(event.pointerId);
      if (pointers.size === 0) endGesture();
      else {
        dragging = pointers.size >= 2;
        rebaseGesture();
      }
    }

    listenActive('pointerup', finishPointer);
    listenActive('pointercancel', finishPointer);

    listenActive('dblclick', (event) => {
      if (isInterfaceTarget(event.target)) return;
      event.preventDefault();
      resetCamera();
    });

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
      const space = event.key === ' ' || event.key === 'Spacebar';
      if ((space && isInterfaceTarget(event.target)) || (event.repeat && (space || event.key === 'm' || event.key === 'M'))) return;
      let handled = true;
      if (event.key === 'ArrowLeft') targetYaw -= 0.12;
      else if (event.key === 'ArrowRight') targetYaw += 0.12;
      else if (event.key === 'ArrowUp') targetPitch = clamp(targetPitch - 0.08, -MAX_PITCH, MAX_PITCH);
      else if (event.key === 'ArrowDown') targetPitch = clamp(targetPitch + 0.08, -MAX_PITCH, MAX_PITCH);
      else if (event.key === 'r' || event.key === 'R') resetCamera();
      else if (event.key === 'm' || event.key === 'M') beginMorph();
      else if (space) setPaused(!paused);
      else handled = false;
      if (handled) {
        event.preventDefault();
        renderPausedCamera();
      }
    });

    button.addEventListener('click', () => {
      if (isActive()) setPaused(!paused);
    });
    if (resetButton) resetButton.addEventListener('click', () => {
      if (isActive()) resetCamera();
    });
    if (morphButton) morphButton.addEventListener('click', () => {
      if (isActive()) beginMorph();
    });

    canvas.style.touchAction = 'none';
    document.body.style.touchAction = 'none';
    document.body.style.cursor = 'grab';
    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    listenActive('resize', resize, { passive: true });
    window.asciiSculpture = {
      get frame() { return frame; },
      get paused() { return paused; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get camera() {
        return {
          yaw,
          pitch,
          tilt: pitch,
          zoom: DEFAULT_ZOOM,
          targetYaw,
          targetPitch,
          targetTilt: targetPitch,
          targetZoom: DEFAULT_ZOOM,
          dragging
        };
      },
      get form() { return FORM_NAMES[currentForm]; },
      get formIndex() { return currentForm; },
      get forms() { return FORM_NAMES.slice(); },
      get morphing() { return morphing; },
      get morph() {
        return {
          active: morphing,
          automatic: morphAutomatic,
          from: FORM_NAMES[morphFrom],
          to: FORM_NAMES[morphTo],
          fromIndex: morphFrom,
          toIndex: morphTo,
          progress: morphProgress,
          mix: morphProgress * morphProgress * (3 - 2 * morphProgress)
        };
      },
      get columns() { return columns; },
      get rows() { return rows; },
      get cellWidth() { return cellW; },
      get cellHeight() { return cellH; },
      get fontSize() { return fontSize; },
      get occupiedCells() { return raster ? raster.occupied : 0; }
    };

    updateFormLabel();
    updateButton();
    if (isActive()) resize();
    gallery.subscribe((id) => {
      if (id === 'sculpture') {
        updateButton();
        updateFormLabel();
        const normalizedDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        if (!raster || width !== window.innerWidth || height !== window.innerHeight) resize();
        else if (dpr !== normalizedDpr) refreshBackingStore(normalizedDpr);
        else {
          maskInterface();
          draw();
        }
      } else {
        for (const pointerId of pointers.keys()) releaseCapture(pointerId);
        pointers.clear();
        endGesture();
      }
      syncAnimation();
    });
    syncAnimation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
