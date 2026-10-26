(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const CAMERA_DISTANCE = 7.5;
  const FIXED_ZOOM = 1;
  const DEFAULT_YAW = -0.42;
  const DEFAULT_PITCH = -0.26;
  const MAX_PITCH = 1.15;
  const PALETTES = [
    { name: 'Spectrum', hues: [326, 16, 46, 108, 176, 214, 256, 288] },
    { name: 'Aurora', hues: [174, 196, 222, 258, 292, 326, 142, 108] },
    { name: 'Solar', hues: [4, 22, 38, 52, 328, 304, 274, 194] },
    { name: 'Opal', hues: [210, 250, 300, 330, 30, 90, 160, 190] }
  ];

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function hue(value) {
    return ((value % 360) + 360) % 360;
  }

  function color(value, saturation, lightness, alpha) {
    return 'hsla(' + hue(value).toFixed(1) + ', ' + saturation + '%, ' + lightness + '%, ' + alpha + ')';
  }

  function cross(a, b, c) {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const abz = b[2] - a[2];
    const acx = c[0] - a[0];
    const acy = c[1] - a[1];
    const acz = c[2] - a[2];
    return [
      aby * acz - abz * acy,
      abz * acx - abx * acz,
      abx * acy - aby * acx
    ];
  }

  function createPolyhedron(name, vertices, polygons, options) {
    const normalized = vertices.map((vertex) => {
      const length = Math.hypot(vertex[0], vertex[1], vertex[2]) || 1;
      return [vertex[0] / length, vertex[1] / length, vertex[2] / length];
    });
    const faces = [];
    for (const polygon of polygons) {
      for (let index = 1; index < polygon.length - 1; index++) {
        const triangle = [polygon[0], polygon[index], polygon[index + 1]];
        const a = normalized[triangle[0]];
        const b = normalized[triangle[1]];
        const c = normalized[triangle[2]];
        const normal = cross(a, b, c);
        const center = [
          (a[0] + b[0] + c[0]) / 3,
          (a[1] + b[1] + c[1]) / 3,
          (a[2] + b[2] + c[2]) / 3
        ];
        if (normal[0] * center[0] + normal[1] * center[1] + normal[2] * center[2] < 0) {
          triangle.reverse();
        }
        faces.push({ indices: triangle, colorIndex: faces.length + options.colorOffset });
      }
    }
    return { name, vertices: normalized, faces, ...options };
  }

  function buildMeshes() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const icosahedron = createPolyhedron('Icosahedron', [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ], [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ], {
      scale: 1.34,
      center: [0, 0, 0],
      phase: 0.18,
      tilt: 0.12,
      roll: -0.08,
      spin: 0.05,
      float: 0.025,
      alpha: 0.47,
      colorOffset: 0
    });

    const octahedron = createPolyhedron('Octahedron', [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ], [
      [2, 0, 4], [2, 4, 1], [2, 1, 5], [2, 5, 0],
      [3, 4, 0], [3, 1, 4], [3, 5, 1], [3, 0, 5]
    ], {
      scale: 0.73,
      center: [0, 0, 0],
      phase: 0.58,
      tilt: -0.24,
      roll: 0.18,
      spin: -0.115,
      float: 0,
      alpha: 0.61,
      colorOffset: 3
    });

    const tetrahedron = createPolyhedron('Tetrahedron', [
      [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]
    ], [
      [0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]
    ], {
      scale: 0.43,
      center: [1.45, 1, -0.35],
      phase: -0.35,
      tilt: 0.4,
      roll: 0.2,
      spin: 0.09,
      float: 0.11,
      alpha: 0.58,
      colorOffset: 5
    });

    return [icosahedron, octahedron, tetrahedron];
  }

  function start() {
    const canvas = document.getElementById('prism-canvas');
    const formLabel = document.getElementById('prism-form');
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
    const meshes = buildMeshes();

    let width = 0;
    let height = 0;
    let dpr = 1;
    let viewport = null;
    let yaw = DEFAULT_YAW;
    let pitch = DEFAULT_PITCH;
    let targetYaw = DEFAULT_YAW;
    let targetPitch = DEFAULT_PITCH;
    let paletteIndex = 0;
    let time = 0;
    let paused = motionQuery.matches;
    let frame = 0;
    let lastTime = 0;
    let animationRequest = null;
    let activePointer = null;
    let dragging = false;
    let drawnFaces = [];

    function isActive() {
      return gallery.is('prism');
    }

    function canAnimate() {
      return isActive() && !document.hidden && !paused;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function projectMeshes() {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const projectedMeshes = meshes.map((mesh) => {
        const localYaw = mesh.phase + time * mesh.spin;
        const localPitch = mesh.tilt + time * mesh.spin * 0.43;
        const localRoll = mesh.roll + time * mesh.spin * 0.28;
        const cosLocalYaw = Math.cos(localYaw);
        const sinLocalYaw = Math.sin(localYaw);
        const cosLocalPitch = Math.cos(localPitch);
        const sinLocalPitch = Math.sin(localPitch);
        const cosLocalRoll = Math.cos(localRoll);
        const sinLocalRoll = Math.sin(localRoll);
        const floatingY = mesh.center[1] + Math.sin(time * 0.35 + mesh.phase) * mesh.float;
        const viewPoints = [];
        const screenPoints = [];

        for (const vertex of mesh.vertices) {
          const rolledX = vertex[0] * cosLocalRoll - vertex[1] * sinLocalRoll;
          const rolledY = vertex[0] * sinLocalRoll + vertex[1] * cosLocalRoll;
          const pitchedY = rolledY * cosLocalPitch - vertex[2] * sinLocalPitch;
          const pitchedZ = rolledY * sinLocalPitch + vertex[2] * cosLocalPitch;
          const localX = rolledX * cosLocalYaw + pitchedZ * sinLocalYaw;
          const localZ = -rolledX * sinLocalYaw + pitchedZ * cosLocalYaw;
          const worldX = localX * mesh.scale + mesh.center[0];
          const worldY = pitchedY * mesh.scale + floatingY;
          const worldZ = localZ * mesh.scale + mesh.center[2];
          const rotatedX = worldX * cosYaw + worldZ * sinYaw;
          const yawZ = -worldX * sinYaw + worldZ * cosYaw;
          const rotatedY = worldY * cosPitch - yawZ * sinPitch;
          const rotatedZ = worldY * sinPitch + yawZ * cosPitch;
          const depth = CAMERA_DISTANCE - rotatedZ;
          const perspective = CAMERA_DISTANCE / depth * FIXED_ZOOM;
          viewPoints.push({ x: rotatedX, y: rotatedY, z: rotatedZ });
          screenPoints.push({
            x: viewport.centerX + rotatedX * viewport.scale * perspective,
            y: viewport.centerY - rotatedY * viewport.scale * perspective
          });
        }
        return { mesh, viewPoints, screenPoints };
      });

      const facets = [];
      for (const projected of projectedMeshes) {
        for (const face of projected.mesh.faces) {
          const indices = face.indices;
          const view = [
            projected.viewPoints[indices[0]],
            projected.viewPoints[indices[1]],
            projected.viewPoints[indices[2]]
          ];
          const points = [
            projected.screenPoints[indices[0]],
            projected.screenPoints[indices[1]],
            projected.screenPoints[indices[2]]
          ];
          const a = [view[0].x, view[0].y, view[0].z];
          const b = [view[1].x, view[1].y, view[1].z];
          const c = [view[2].x, view[2].y, view[2].z];
          const normal = cross(a, b, c);
          const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
          facets.push({
            mesh: projected.mesh.name,
            depth: (CAMERA_DISTANCE * 3 - view[0].z - view[1].z - view[2].z) / 3,
            view,
            points,
            normal: [normal[0] / length, normal[1] / length, normal[2] / length],
            colorIndex: face.colorIndex,
            alpha: projected.mesh.alpha
          });
        }
      }
      facets.sort((a, b) => b.depth - a.depth || a.colorIndex - b.colorIndex);
      return facets;
    }

    function tracePolygon(points) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y);
      ctx.closePath();
    }

    function drawBackground() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#f6f1fb');
      background.addColorStop(0.48, '#eee8f8');
      background.addColorStop(1, '#e3daef');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const halo = ctx.createRadialGradient(
        viewport.centerX, viewport.centerY, 0,
        viewport.centerX, viewport.centerY, viewport.scale * 3.1
      );
      halo.addColorStop(0, 'rgba(255, 255, 255, 0.76)');
      halo.addColorStop(0.45, 'rgba(250, 246, 255, 0.32)');
      halo.addColorStop(1, 'rgba(215, 199, 235, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);
    }

    function drawBeams() {
      const hues = PALETTES[paletteIndex].hues;
      const length = Math.hypot(width, height) * 1.15;
      const originX = viewport.centerX - viewport.scale * 1.55;
      const originY = viewport.centerY + viewport.scale * 1.45;
      for (let index = 0; index < hues.length; index++) {
        const angle = -0.72 + index * 0.047 + Math.sin(time * 0.12 + index * 0.6) * 0.025 + yaw * 0.035;
        const farX = originX + Math.cos(angle) * length;
        const farY = originY + Math.sin(angle) * length;
        const spread = viewport.scale * (0.12 + index * 0.017);
        const normalX = -Math.sin(angle) * spread;
        const normalY = Math.cos(angle) * spread;
        const beam = ctx.createLinearGradient(originX, originY, farX, farY);
        beam.addColorStop(0, color(hues[index], 82, 62, 0));
        beam.addColorStop(0.28, color(hues[index], 82, 62, 0.055));
        beam.addColorStop(0.7, color(hues[index] + 12, 86, 58, 0.12));
        beam.addColorStop(1, color(hues[index] + 24, 86, 58, 0));
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(farX + normalX, farY + normalY);
        ctx.lineTo(farX - normalX, farY - normalY);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(farX, farY);
        ctx.strokeStyle = color(hues[index] + 16, 76, 48, 0.11);
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }
    }

    function drawFacets() {
      const hues = PALETTES[paletteIndex].hues;
      for (const facet of drawnFaces) {
        const normal = facet.normal;
        const diffuse = Math.max(0, normal[0] * -0.38 + normal[1] * 0.64 + normal[2] * 0.69);
        const light = clamp(0.42 + diffuse * 0.48 + Math.abs(normal[2]) * 0.1, 0, 1);
        const baseHue = hues[facet.colorIndex % hues.length] + (1 - normal[2]) * 7 + facet.depth * 0.8;
        const alpha = facet.alpha * (0.72 + light * 0.28);
        const points = facet.points;
        const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
        gradient.addColorStop(0, color(baseHue - 10, 76, 45 + light * 28, alpha * 0.76));
        gradient.addColorStop(0.48, color(baseHue + 12, 84, 55 + light * 22, alpha));
        gradient.addColorStop(1, color(baseHue + 34, 78, 40 + light * 30, alpha * 0.84));
        ctx.fillStyle = gradient;
        tracePolygon(points);
        ctx.fill();
        ctx.strokeStyle = color(baseHue + 18, 70, 32 + light * 30, 0.34 + light * 0.28);
        ctx.lineWidth = facet.mesh === 'Icosahedron' ? 0.8 : 0.65;
        ctx.stroke();

        if (normal[2] > 0) {
          const centerX = (points[0].x + points[1].x + points[2].x) / 3;
          const centerY = (points[0].y + points[1].y + points[2].y) / 3;
          const inner = points.map((point) => ({
            x: centerX + (point.x - centerX) * 0.64,
            y: centerY + (point.y - centerY) * 0.64
          }));
          tracePolygon(inner);
          ctx.strokeStyle = color(baseHue + 44, 90, 72, 0.32);
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }

        if (facet.colorIndex % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.strokeStyle = color(baseHue + 70, 92, 58, 0.55);
          ctx.lineWidth = 1.15;
          ctx.stroke();
        }

        if (normal[2] > 0.72 && facet.colorIndex % 4 === 0) {
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, 1.25, 0, TAU);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function draw() {
      if (!viewport) return;
      drawBackground();
      drawBeams();
      drawnFaces = projectMeshes();
      drawFacets();
      frame++;
    }

    function resize() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.style.touchAction = 'none';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewport = {
        width,
        height,
        scale: Math.min(width, height) * (width < 700 ? 0.24 : 0.235),
        centerX: width * (width >= 800 ? 0.6 : 0.53),
        centerY: height * (width < 700 ? 0.36 : 0.46)
      };
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

    function updatePaletteLabel() {
      if (formLabel) {
        formLabel.textContent = String(paletteIndex + 1).padStart(2, '0') + ' / ' + PALETTES[paletteIndex].name;
      }
    }

    function cyclePalette() {
      paletteIndex = (paletteIndex + 1) % PALETTES.length;
      updatePaletteLabel();
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
      time += dt;
      updateCamera(dt);
      draw();
      if (canAnimate()) animationRequest = window.requestAnimationFrame(animate);
      else lastTime = 0;
    }

    function syncAnimation() {
      if (!canAnimate()) {
        if (animationRequest !== null) window.cancelAnimationFrame(animationRequest);
        animationRequest = null;
        lastTime = 0;
        return;
      }
      if (animationRequest === null) {
        lastTime = 0;
        animationRequest = window.requestAnimationFrame(animate);
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

    function endGesture() {
      activePointer = null;
      dragging = false;
      document.body.classList.remove('is-dragging');
    }

    function cancelGesture() {
      if (activePointer) releaseCapture(activePointer.id);
      endGesture();
    }

    listenActive('pointerdown', (event) => {
      if (event.button !== 0 || isInterfaceTarget(event.target) || activePointer) return;
      event.preventDefault();
      const focused = document.activeElement;
      if (isInterfaceTarget(focused) && typeof focused.blur === 'function') focused.blur();
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        return;
      }
      activePointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        type: event.pointerType
      };
    }, { passive: false });

    listenActive('pointermove', (event) => {
      if (!activePointer || activePointer.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - activePointer.x;
      const dy = event.clientY - activePointer.y;
      activePointer.x = event.clientX;
      activePointer.y = event.clientY;
      const distance = Math.hypot(event.clientX - activePointer.startX, event.clientY - activePointer.startY);
      const threshold = activePointer.type === 'touch' ? 8 : 5;
      if (!activePointer.moved && distance < threshold) return;
      activePointer.moved = true;
      dragging = true;
      document.body.classList.add('is-dragging');
      targetYaw += dx * 0.008;
      targetPitch = clamp(targetPitch + dy * 0.006, -MAX_PITCH, MAX_PITCH);
      renderPausedCamera();
    }, { passive: false });

    function finishPointer(event, allowPalette) {
      if (!activePointer || activePointer.id !== event.pointerId) return;
      const wasClick = !activePointer.moved;
      releaseCapture(event.pointerId);
      endGesture();
      if (allowPalette && wasClick) cyclePalette();
    }

    listenActive('pointerup', (event) => finishPointer(event, true));
    listenActive('pointercancel', (event) => finishPointer(event, false));

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
      const space = event.key === ' ' || event.key === 'Spacebar';
      const paletteKey = event.key === 'c' || event.key === 'C' || event.key === 'Enter';
      const nativeActivation = space || event.key === 'Enter';
      if (nativeActivation && isInterfaceTarget(event.target)) return;
      if (event.repeat && (space || paletteKey)) return;
      let handled = true;
      if (event.key === 'ArrowLeft') targetYaw -= 0.12;
      else if (event.key === 'ArrowRight') targetYaw += 0.12;
      else if (event.key === 'ArrowUp') targetPitch = clamp(targetPitch - 0.08, -MAX_PITCH, MAX_PITCH);
      else if (event.key === 'ArrowDown') targetPitch = clamp(targetPitch + 0.08, -MAX_PITCH, MAX_PITCH);
      else if (event.key === 'r' || event.key === 'R') resetCamera();
      else if (paletteKey) cyclePalette();
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

    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    listenActive('resize', resize, { passive: true });
    window.prismArt = {
      get frame() { return frame; },
      get paused() { return paused; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get yaw() { return yaw; },
      get pitch() { return pitch; },
      get targetYaw() { return targetYaw; },
      get targetPitch() { return targetPitch; },
      get dragging() { return dragging; },
      get paletteIndex() { return paletteIndex; },
      get paletteName() { return PALETTES[paletteIndex].name; },
      get paletteCount() { return PALETTES.length; },
      get meshCount() { return meshes.length; },
      get meshNames() { return meshes.map((mesh) => mesh.name); },
      get facetCount() { return drawnFaces.length; },
      get facets() {
        return drawnFaces.map((facet) => ({
          mesh: facet.mesh,
          depth: facet.depth,
          view: facet.view.map((point) => ({ x: point.x, y: point.y, z: point.z })),
          points: facet.points.map((point) => ({ x: point.x, y: point.y }))
        }));
      },
      get camera() { return { distance: CAMERA_DISTANCE, zoom: FIXED_ZOOM }; },
      get viewport() { return viewport ? { ...viewport } : null; }
    };

    updatePaletteLabel();
    updateButton();
    if (isActive()) resize();
    gallery.subscribe((id) => {
      if (id === 'prism') {
        updateButton();
        updatePaletteLabel();
        resize();
      } else {
        cancelGesture();
      }
      syncAnimation();
    });
    syncAnimation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
