(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const BACKGROUND = '#050508';
  const TRAIL_FADE = 'rgba(5, 5, 8, 0.105)';
  const COLORS = [
    'rgb(61, 245, 255)',
    'rgb(77, 176, 255)',
    'rgb(155, 116, 255)',
    'rgb(255, 79, 200)',
    'rgb(255, 126, 218)',
    'rgb(208, 252, 255)'
  ];

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function start() {
    const canvas = document.getElementById('neon-canvas');
    const formLabel = document.getElementById('neon-form');
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
    const initialSeed = (Math.random() * 4294967296) >>> 0;
    const particles = [];
    const impulses = [];
    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      vx: 0,
      vy: 0,
      active: false,
      down: false,
      keyboard: false,
      pointerId: null,
      downX: 0,
      downY: 0,
      lastEvent: 0
    };

    let seed = initialSeed;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let topShade = null;
    let bottomShade = null;
    let captionShade = null;
    let initialized = false;
    let paused = motionQuery.matches;
    let frame = 0;
    let elapsed = 0;
    let resetCount = 0;
    let impulseCount = 0;
    let animationRequest = null;
    let lastTime = null;

    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function isActive() {
      return gallery.is('neon');
    }

    function canAnimate() {
      return isActive() && !document.hidden && !paused;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function motionScale() {
      return clamp(Math.min(width, height) / 720, 0.72, 1.2);
    }

    function targetParticleCount() {
      return Math.round(clamp(width * height / 1750, 420, 820));
    }

    function fieldAngle(x, y, time) {
      const scale = Math.max(320, Math.min(width, height));
      const u = x / scale;
      const v = y / scale;
      return Math.sin(u * 3.7 + time * 0.19) * 1.18
        + Math.cos(v * 4.3 - time * 0.16) * 1.02
        + Math.sin((u + v) * 2.6 + time * 0.11) * 0.62
        + Math.cos((u - v) * 5.1 - time * 0.07) * 0.28
        - 0.12;
    }

    function placeParticle(particle, initial) {
      particle.x = random() * width;
      particle.y = random() * height;
      particle.speed = (42 + random() * 62) * motionScale();
      particle.life = 5.5 + random() * 7;
      particle.age = initial ? random() * particle.life * 0.82 : 0;
      particle.phase = random() * TAU;
      const angle = fieldAngle(particle.x, particle.y, elapsed);
      particle.vx = Math.cos(angle) * particle.speed * 0.72;
      particle.vy = Math.sin(angle) * particle.speed * 0.72;
      particle.px = particle.x - particle.vx * (initial ? 0.055 : 0);
      particle.py = particle.y - particle.vy * (initial ? 0.055 : 0);
      particle.fresh = !initial;
      if (initial) {
        const choice = random();
        particle.color = choice < 0.38 ? 0
          : (choice < 0.52 ? 1
            : (choice < 0.64 ? 2
              : (choice < 0.91 ? 3 : (choice < 0.97 ? 4 : 5))));
        particle.tone = Math.floor(random() * 3);
      }
    }

    function createParticle(index, initial = true) {
      const particle = { index, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0 };
      placeParticle(particle, initial);
      return particle;
    }

    function initializeParticles() {
      particles.length = 0;
      const count = targetParticleCount();
      for (let index = 0; index < count; index++) particles.push(createParticle(index));
      initialized = true;
    }

    function clearPointer(recenter) {
      pointer.active = false;
      pointer.down = false;
      pointer.keyboard = false;
      pointer.pointerId = null;
      pointer.vx = 0;
      pointer.vy = 0;
      pointer.lastEvent = 0;
      if (recenter) {
        pointer.x = width * 0.5;
        pointer.y = height * 0.5;
      }
    }

    function pointerSnapshot() {
      return {
        x: pointer.x,
        y: pointer.y,
        vx: pointer.vx,
        vy: pointer.vy,
        active: pointer.active,
        down: pointer.down,
        keyboard: pointer.keyboard,
        pointerId: pointer.pointerId
      };
    }

    function updateButton() {
      if (!isActive()) return;
      if (label) label.textContent = paused ? 'Resume motion' : 'Pause motion';
      if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
      if (formLabel) formLabel.textContent = paused ? '01 / Flow · Motion held' : '01 / Flow · Enter to pulse';
    }

    function buildShades() {
      const topDepth = Math.min(170, height * 0.28);
      const bottomDepth = Math.min(330, height * 0.46);
      topShade = ctx.createLinearGradient(0, 0, 0, topDepth);
      topShade.addColorStop(0, 'rgba(5, 5, 8, 0.86)');
      topShade.addColorStop(1, 'rgba(5, 5, 8, 0)');
      bottomShade = ctx.createLinearGradient(0, height, 0, height - bottomDepth);
      bottomShade.addColorStop(0, 'rgba(5, 5, 8, 0.94)');
      bottomShade.addColorStop(0.58, 'rgba(5, 5, 8, 0.48)');
      bottomShade.addColorStop(1, 'rgba(5, 5, 8, 0)');
      captionShade = ctx.createLinearGradient(0, 0, width * 0.64, 0);
      captionShade.addColorStop(0, 'rgba(5, 5, 8, 0.42)');
      captionShade.addColorStop(1, 'rgba(5, 5, 8, 0)');
    }

    function configureBackingStore() {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildShades();
    }

    function drawPointer() {
      if (!pointer.active) return;
      const radius = pointer.down ? 118 : 88;
      const halo = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      halo.addColorStop(0, pointer.down ? 'rgba(255, 79, 200, 0.13)' : 'rgba(61, 245, 255, 0.10)');
      halo.addColorStop(0.35, 'rgba(116, 119, 255, 0.045)');
      halo.addColorStop(1, 'rgba(5, 5, 8, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.fillRect(pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, pointer.down ? 5 : 3, 0, TAU);
      ctx.strokeStyle = pointer.down ? COLORS[3] : COLORS[0];
      ctx.globalAlpha = 0.58;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    function drawImpulses() {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const impulse of impulses) {
        const progress = clamp(impulse.age / impulse.life, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const fade = Math.pow(1 - progress, 2);
        const radius = 10 + impulse.maxRadius * eased;
        ctx.beginPath();
        ctx.arc(impulse.x, impulse.y, radius, 0, TAU);
        ctx.strokeStyle = impulse.color === 0 ? COLORS[0] : COLORS[3];
        ctx.globalAlpha = fade * 0.62;
        ctx.lineWidth = 1.6 - progress * 0.9;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(impulse.x, impulse.y, radius * 0.78, 0, TAU);
        ctx.strokeStyle = impulse.color === 0 ? COLORS[3] : COLORS[0];
        ctx.globalAlpha = fade * 0.24;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }

    function draw(clear) {
      if (!initialized) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = clear ? BACKGROUND : TRAIL_FADE;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      for (let color = 0; color < COLORS.length; color++) {
        for (let tone = 0; tone < 3; tone++) {
          ctx.beginPath();
          let segments = 0;
          for (const particle of particles) {
            if (particle.fresh || particle.color !== color || particle.tone !== tone) continue;
            ctx.moveTo(particle.px, particle.py);
            ctx.lineTo(particle.x, particle.y);
            segments++;
          }
          if (!segments) continue;
          ctx.strokeStyle = COLORS[color];
          ctx.globalAlpha = 0.052 + tone * 0.018;
          ctx.lineWidth = 3.1 + tone * 0.55;
          ctx.stroke();
          ctx.globalAlpha = 0.34 + tone * 0.19;
          ctx.lineWidth = 0.55 + tone * 0.24;
          ctx.stroke();
        }
      }

      for (let color = 0; color < COLORS.length; color++) {
        ctx.beginPath();
        let heads = 0;
        for (const particle of particles) {
          if (particle.color !== color || particle.tone !== 2 || particle.index % 7 !== 0) continue;
          ctx.moveTo(particle.x + 0.85, particle.y);
          ctx.arc(particle.x, particle.y, 0.85, 0, TAU);
          heads++;
        }
        if (!heads) continue;
        ctx.fillStyle = COLORS[color];
        ctx.globalAlpha = 0.72;
        ctx.fill();
      }

      drawImpulses();
      drawPointer();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = topShade;
      ctx.fillRect(0, 0, width, Math.min(170, height * 0.28));
      ctx.fillStyle = bottomShade;
      const bottomDepth = Math.min(330, height * 0.46);
      ctx.fillRect(0, height - bottomDepth, width, bottomDepth);
      ctx.fillStyle = captionShade;
      ctx.fillRect(0, height * 0.44, width * 0.64, height * 0.56);
      ctx.globalAlpha = 1;
    }

    function resize() {
      const previousWidth = width;
      const previousHeight = height;
      const previousMotionScale = initialized ? motionScale() : 1;
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      configureBackingStore();

      if (!initialized) {
        clearPointer(true);
        initializeParticles();
      } else {
        const scaleX = width / previousWidth;
        const scaleY = height / previousHeight;
        const speedScale = motionScale() / previousMotionScale;
        for (const particle of particles) {
          particle.x *= scaleX;
          particle.y *= scaleY;
          particle.px *= scaleX;
          particle.py *= scaleY;
          particle.speed *= speedScale;
        }
        const count = targetParticleCount();
        while (particles.length < count) particles.push(createParticle(particles.length));
        particles.length = count;
        for (let index = 0; index < particles.length; index++) particles[index].index = index;
        for (const impulse of impulses) {
          impulse.x *= scaleX;
          impulse.y *= scaleY;
        }
        pointer.x *= scaleX;
        pointer.y *= scaleY;
        pointer.downX *= scaleX;
        pointer.downY *= scaleY;
      }
      lastTime = null;
      draw(true);
    }

    function refreshBackingStore(nextDpr) {
      dpr = nextDpr;
      configureBackingStore();
      draw(true);
    }

    function updateParticles(dt) {
      const pointerRadius = clamp(Math.min(width, height) * 0.30, 110, 240);
      const pointerRadiusSquared = pointerRadius * pointerRadius;
      const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
      for (const particle of particles) {
        particle.px = particle.x;
        particle.py = particle.y;
        particle.age += dt;
        if (particle.age >= particle.life
          || particle.x < -70 || particle.x > width + 70
          || particle.y < -70 || particle.y > height + 70) {
          placeParticle(particle, false);
          continue;
        }

        const angle = fieldAngle(particle.x, particle.y, elapsed)
          + Math.sin(elapsed * 0.31 + particle.phase) * 0.16;
        let desiredX = Math.cos(angle) * particle.speed + 8 * motionScale();
        let desiredY = Math.sin(angle) * particle.speed;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < pointerRadiusSquared) {
            const distance = Math.max(0.001, Math.sqrt(distanceSquared));
            const proximity = 1 - distance / pointerRadius;
            const falloff = proximity * proximity * (3 - 2 * proximity);
            const normalX = distance > 0.01 ? dx / distance : Math.cos(particle.phase);
            const normalY = distance > 0.01 ? dy / distance : Math.sin(particle.phase);
            const swirl = (82 + Math.min(160, pointerSpeed * 0.09)) * falloff * (pointer.down ? 1.3 : 1);
            desiredX += -normalY * swirl + normalX * 24 * falloff + pointer.vx * 0.23 * falloff;
            desiredY += normalX * swirl + normalY * 24 * falloff + pointer.vy * 0.23 * falloff;
          }
        }

        const blend = 1 - Math.exp(-dt * 3.15);
        particle.vx += (desiredX - particle.vx) * blend;
        particle.vy += (desiredY - particle.vy) * blend;
        const speed = Math.hypot(particle.vx, particle.vy);
        const maximumSpeed = particle.speed * 3.2 + 240;
        if (speed > maximumSpeed) {
          particle.vx *= maximumSpeed / speed;
          particle.vy *= maximumSpeed / speed;
        }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.fresh = false;
      }
      const pointerDecay = Math.exp(-dt * 4.8);
      pointer.vx *= pointerDecay;
      pointer.vy *= pointerDecay;
    }

    function updateImpulses(dt) {
      for (let index = impulses.length - 1; index >= 0; index--) {
        impulses[index].age += dt;
        if (impulses[index].age >= impulses[index].life) impulses.splice(index, 1);
      }
    }

    function addImpulse(x, y) {
      if (!initialized) return;
      const maxRadius = clamp(Math.min(width, height) * 0.42, 160, 360);
      if (impulses.length >= 6) impulses.shift();
      impulses.push({
        x,
        y,
        age: 0,
        life: 1.05,
        maxRadius,
        color: impulseCount % 2
      });
      for (const particle of particles) {
        const dx = particle.x - x;
        const dy = particle.y - y;
        const distance = Math.hypot(dx, dy);
        if (distance >= maxRadius) continue;
        const falloff = 1 - distance / maxRadius;
        const normalX = distance > 0.01 ? dx / distance : Math.cos(particle.phase);
        const normalY = distance > 0.01 ? dy / distance : Math.sin(particle.phase);
        const force = 75 + 175 * falloff;
        particle.vx += normalX * force - normalY * 58 * falloff;
        particle.vy += normalY * force + normalX * 58 * falloff;
      }
      impulseCount++;
      if (paused) draw(false);
    }

    function resetFlow() {
      seed = initialSeed;
      elapsed = 0;
      frame = 0;
      impulses.length = 0;
      clearPointer(true);
      initializeParticles();
      resetCount++;
      lastTime = null;
      draw(true);
      syncAnimation();
    }

    function setPaused(value) {
      paused = Boolean(value);
      lastTime = null;
      updateButton();
      syncAnimation();
    }

    function syncAnimation() {
      if (!canAnimate()) {
        if (animationRequest !== null) cancelAnimationFrame(animationRequest);
        animationRequest = null;
        lastTime = null;
        return;
      }
      if (animationRequest === null) {
        lastTime = null;
        animationRequest = requestAnimationFrame(animate);
      }
    }

    function animate(now) {
      animationRequest = null;
      if (!canAnimate()) {
        lastTime = null;
        return;
      }
      const dt = lastTime === null ? 0 : clamp((now - lastTime) / 1000, 0, 0.04);
      lastTime = now;
      if (dt > 0) {
        elapsed += dt;
        updateParticles(dt);
        updateImpulses(dt);
      }
      draw(false);
      frame++;
      if (canAnimate()) animationRequest = requestAnimationFrame(animate);
      else lastTime = null;
    }

    function isInterfaceTarget(target) {
      return target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]');
    }

    function isEditableTarget(target) {
      return target instanceof Element && target.closest('input, select, textarea, [role="textbox"], [contenteditable="true"]');
    }

    function movePointer(event) {
      const x = clamp(event.clientX, 0, width);
      const y = clamp(event.clientY, 0, height);
      if (pointer.active && !pointer.keyboard) {
        const dt = Math.max(0.008, (event.timeStamp - pointer.lastEvent) / 1000);
        const vx = clamp((x - pointer.x) / dt, -650, 650);
        const vy = clamp((y - pointer.y) / dt, -650, 650);
        pointer.vx = pointer.vx * 0.35 + vx * 0.65;
        pointer.vy = pointer.vy * 0.35 + vy * 0.65;
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointer.keyboard = false;
      pointer.lastEvent = event.timeStamp;
    }

    listenActive('pointermove', (event) => {
      if (isInterfaceTarget(event.target)) {
        if (!pointer.down) pointer.active = false;
        return;
      }
      event.preventDefault();
      movePointer(event);
      if (paused) draw(false);
    }, { passive: false });

    listenActive('pointerdown', (event) => {
      if (event.button !== 0 || isInterfaceTarget(event.target)) return;
      event.preventDefault();
      const focused = document.activeElement;
      if (isInterfaceTarget(focused) && typeof focused.blur === 'function') focused.blur();
      movePointer(event);
      pointer.down = true;
      pointer.pointerId = event.pointerId;
      pointer.downX = pointer.x;
      pointer.downY = pointer.y;
      if (paused) draw(false);
    }, { passive: false });

    listenActive('pointerup', (event) => {
      if (!pointer.down || event.pointerId !== pointer.pointerId) return;
      const interfaceTarget = isInterfaceTarget(event.target);
      const wasClick = Math.hypot(event.clientX - pointer.downX, event.clientY - pointer.downY) <= 9;
      if (!interfaceTarget) {
        event.preventDefault();
        movePointer(event);
      }
      pointer.down = false;
      pointer.pointerId = null;
      if (wasClick && !interfaceTarget) addImpulse(pointer.x, pointer.y);
      else if (paused) draw(false);
    }, { passive: false });

    listenActive('pointercancel', (event) => {
      if (event.pointerId !== pointer.pointerId) return;
      clearPointer(false);
      if (paused) draw(false);
    });

    listenActive('pointerout', (event) => {
      if (!event.relatedTarget && !pointer.down) clearPointer(false);
    });

    listenActive('blur', () => clearPointer(false));

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
      const space = event.key === ' ' || event.key === 'Spacebar';
      const arrow = event.key.startsWith('Arrow');
      const impulseKey = event.key === 'Enter' || event.key === 'i' || event.key === 'I';
      if ((space || arrow || impulseKey) && isInterfaceTarget(event.target)) return;
      if (event.repeat && (space || impulseKey || event.key === 'r' || event.key === 'R')) return;
      let handled = true;
      if (arrow) {
        const step = event.shiftKey ? 64 : 30;
        if (!pointer.active) clearPointer(true);
        pointer.active = true;
        pointer.keyboard = true;
        pointer.down = false;
        pointer.pointerId = null;
        pointer.vx = 0;
        pointer.vy = 0;
        if (event.key === 'ArrowLeft') {
          pointer.x = clamp(pointer.x - step, 0, width);
          pointer.vx = -220;
        } else if (event.key === 'ArrowRight') {
          pointer.x = clamp(pointer.x + step, 0, width);
          pointer.vx = 220;
        } else if (event.key === 'ArrowUp') {
          pointer.y = clamp(pointer.y - step, 0, height);
          pointer.vy = -220;
        } else if (event.key === 'ArrowDown') {
          pointer.y = clamp(pointer.y + step, 0, height);
          pointer.vy = 220;
        } else {
          handled = false;
        }
        if (handled && paused) draw(false);
      } else if (space) {
        setPaused(!paused);
      } else if (impulseKey) {
        addImpulse(pointer.active ? pointer.x : width * 0.5, pointer.active ? pointer.y : height * 0.5);
      } else if (event.key === 'r' || event.key === 'R') {
        resetFlow();
      } else if (event.key === 'Escape') {
        clearPointer(false);
        if (paused) draw(false);
      } else {
        handled = false;
      }
      if (handled) event.preventDefault();
    });

    button.addEventListener('click', () => {
      if (isActive()) setPaused(!paused);
    });
    if (resetButton) resetButton.addEventListener('click', () => {
      if (isActive()) resetFlow();
    });
    canvas.style.touchAction = 'none';
    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      setPaused(event.matches);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    listenActive('resize', resize, { passive: true });

    window.neonFlow = {
      get frame() { return frame; },
      get paused() { return paused; },
      get particleCount() { return particles.length; },
      get pointer() { return pointerSnapshot(); },
      get pointerState() { return pointerSnapshot(); },
      get resetCount() { return resetCount; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get reducedMotion() { return motionQuery.matches; },
      get elapsed() { return elapsed; },
      get fieldTime() { return elapsed; },
      get impulseCount() { return impulseCount; },
      get activeImpulseCount() { return impulses.length; },
      get width() { return width; },
      get height() { return height; },
      get dpr() { return dpr; },
      get particleSnapshot() {
        return particles.map((particle) => ({
          x: particle.x,
          y: particle.y,
          vx: particle.vx,
          vy: particle.vy,
          age: particle.age,
          life: particle.life,
          color: particle.color,
          tone: particle.tone
        }));
      }
    };

    updateButton();
    if (isActive()) resize();
    gallery.subscribe((id) => {
      if (id === 'neon') {
        updateButton();
        const normalizedDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        if (!initialized || width !== window.innerWidth || height !== window.innerHeight) resize();
        else if (dpr !== normalizedDpr) refreshBackingStore(normalizedDpr);
      } else {
        clearPointer(false);
      }
      syncAnimation();
    });
    syncAnimation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
