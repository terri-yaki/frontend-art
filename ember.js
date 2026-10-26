(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const SPRITE_SIZE = 96;
  const KINDS = ['flame', 'smoke', 'spark', 'wisp'];

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function start() {
    const canvas = document.getElementById('ember-canvas');
    const formLabel = document.getElementById('ember-form');
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
    const particles = [];
    const coals = [];
    const emission = { flame: 0, smoke: 0, spark: 0, wisp: 0 };
    const rates = { flame: 0, smoke: 0, spark: 0, wisp: 0 };
    const sprites = { flames: [], smoke: null };

    let width = 1;
    let height = 1;
    let dpr = 1;
    let maxParticles = 0;
    let initialized = false;
    let background = null;
    let interfaceShade = null;
    let topShade = null;
    let bottomShade = null;
    let paused = motionQuery.matches;
    let animationRequest = null;
    let lastTime = 0;
    let elapsed = 0;
    let frame = 0;
    let burstCount = 0;
    let lastBurst = null;
    let expiredCount = 0;
    let nextParticleId = 1;
    let seed = (Math.random() * 4294967296) >>> 0;

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function isActive() {
      return gallery.is('ember');
    }

    function canAnimate() {
      return isActive() && !document.hidden && !paused;
    }

    function listenActive(type, listener, options) {
      addWindowListener(type, (event) => {
        if (isActive()) listener(event);
      }, options);
    }

    function hearthX() {
      return width * (width < 700 ? 0.58 : 0.64);
    }

    function hearthY() {
      return height * (width < 700 ? 0.66 : 0.82);
    }

    function hearthSpread() {
      return Math.min(width * (width < 700 ? 0.38 : 0.25), 250);
    }

    function makeSprite(stops) {
      const sprite = document.createElement('canvas');
      sprite.width = SPRITE_SIZE;
      sprite.height = SPRITE_SIZE;
      const spriteContext = sprite.getContext('2d');
      const center = SPRITE_SIZE / 2;
      const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
      for (const [offset, color] of stops) gradient.addColorStop(offset, color);
      spriteContext.fillStyle = gradient;
      spriteContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      return sprite;
    }

    function createSprites() {
      sprites.flames = [
        makeSprite([
          [0, 'rgba(255,255,225,1)'],
          [0.16, 'rgba(255,229,142,0.98)'],
          [0.43, 'rgba(255,156,48,0.74)'],
          [0.72, 'rgba(239,66,20,0.24)'],
          [1, 'rgba(110,15,4,0)']
        ]),
        makeSprite([
          [0, 'rgba(255,235,161,0.98)'],
          [0.25, 'rgba(255,184,58,0.94)'],
          [0.56, 'rgba(255,91,22,0.52)'],
          [1, 'rgba(130,19,5,0)']
        ]),
        makeSprite([
          [0, 'rgba(255,190,86,0.96)'],
          [0.28, 'rgba(255,119,30,0.9)'],
          [0.62, 'rgba(222,49,14,0.44)'],
          [1, 'rgba(105,13,6,0)']
        ]),
        makeSprite([
          [0, 'rgba(255,121,50,0.88)'],
          [0.32, 'rgba(232,65,24,0.75)'],
          [0.68, 'rgba(151,27,18,0.32)'],
          [1, 'rgba(70,12,10,0)']
        ])
      ];
      sprites.smoke = makeSprite([
        [0, 'rgba(133,116,105,0.32)'],
        [0.35, 'rgba(102,88,82,0.22)'],
        [0.72, 'rgba(66,57,55,0.09)'],
        [1, 'rgba(40,34,33,0)']
      ]);
    }

    function configureCapacity() {
      const areaCapacity = Math.max(160, Math.floor(width * height / 1400));
      maxParticles = Math.min(width < 600 ? 320 : 620, areaCapacity);
      rates.flame = maxParticles * 0.32;
      rates.smoke = 5 + maxParticles * 0.014;
      rates.spark = 8 + maxParticles * 0.025;
      rates.wisp = 3 + maxParticles * 0.007;
    }

    function createCoals() {
      coals.length = 0;
      const count = width < 600 ? 18 : 28;
      for (let index = 0; index < count; index++) {
        coals.push({
          offset: (random() - 0.5) * 1.1,
          y: (random() - 0.5) * 18,
          size: 4 + random() * 11,
          phase: random() * TAU,
          speed: 1.2 + random() * 3.2,
          tone: random()
        });
      }
    }

    function spawnParticle(kind, x, y, burst = false, aged = false) {
      if (particles.length >= maxParticles) return false;
      const px = x === undefined ? hearthX() + (random() - 0.5) * hearthSpread() : x;
      const py = y === undefined ? hearthY() + (random() - 0.5) * 12 : y;
      const particle = {
        id: nextParticleId++,
        kind,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        age: 0,
        life: 1,
        size: 10,
        phase: random() * TAU,
        turbulence: 2 + random() * 5,
        tone: random()
      };

      if (kind === 'flame') {
        particle.life = burst ? 0.7 + random() * 0.85 : 0.95 + random() * 1.3;
        particle.size = burst ? 9 + random() * 18 : 15 + random() * 31;
        if (burst) {
          const angle = -Math.PI + random() * Math.PI;
          const speed = 55 + random() * 140;
          particle.vx = Math.cos(angle) * speed * 0.72;
          particle.vy = Math.sin(angle) * speed - 32;
        } else {
          particle.vx = (random() - 0.5) * 30;
          particle.vy = -(72 + random() * 102);
        }
      } else if (kind === 'smoke') {
        particle.life = 3.3 + random() * 2.5;
        particle.size = 30 + random() * 48;
        particle.vx = (random() - 0.5) * (burst ? 48 : 18);
        particle.vy = -(19 + random() * (burst ? 35 : 27));
        particle.y -= burst ? 0 : 16;
      } else if (kind === 'spark') {
        particle.life = 0.85 + random() * 1.55;
        particle.size = 0.55 + random() * 1.35;
        const angle = burst ? random() * TAU : -Math.PI / 2 + (random() - 0.5) * 1.15;
        const speed = burst ? 85 + random() * 245 : 70 + random() * 155;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed - (burst ? 30 : 0);
      } else {
        particle.life = 1.9 + random() * 2.1;
        particle.size = 28 + random() * 52;
        particle.vx = (random() - 0.5) * (burst ? 42 : 17);
        particle.vy = -(31 + random() * 42);
        particle.y -= burst ? 0 : 25;
      }

      if (aged) {
        particle.age = random() * particle.life * 0.88;
        particle.x += particle.vx * particle.age * 0.45;
        particle.y += particle.vy * particle.age * 0.78;
      }
      particles.push(particle);
      return true;
    }

    function seedParticles() {
      const target = Math.floor(maxParticles * 0.58);
      for (let index = 0; index < target; index++) {
        const phase = index % 20;
        const kind = phase < 12 ? 'flame' : (phase < 15 ? 'smoke' : (phase < 19 ? 'spark' : 'wisp'));
        spawnParticle(kind, undefined, undefined, false, true);
      }
    }

    function updateFormLabel() {
      if (formLabel) formLabel.textContent = 'B / Burst · ' + String(burstCount).padStart(2, '0');
    }

    function draw() {
      if (!background) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const hx = hearthX();
      const hy = hearthY();
      const radius = Math.max(130, hearthSpread() * 1.65);
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius);
      const pulse = 0.12 + Math.sin(elapsed * 2.1) * 0.018;
      glow.addColorStop(0, 'rgba(255,91,26,' + pulse + ')');
      glow.addColorStop(0.45, 'rgba(190,47,17,0.055)');
      glow.addColorStop(1, 'rgba(60,18,12,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(hx - radius, hy - radius, radius * 2, radius * 2);

      ctx.globalCompositeOperation = 'source-over';
      for (const particle of particles) {
        if (particle.kind !== 'smoke') continue;
        const t = particle.age / particle.life;
        const size = particle.size * (1 + t * 1.75);
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.55;
        ctx.drawImage(
          sprites.smoke,
          particle.x - size / 2,
          particle.y - size * 0.36,
          size,
          size * 0.72
        );
      }

      ctx.globalAlpha = 1;
      for (const coal of coals) {
        const x = hx + coal.offset * hearthSpread();
        const y = hy + coal.y;
        ctx.fillStyle = coal.tone > 0.55 ? '#30221c' : '#211b18';
        ctx.beginPath();
        ctx.arc(x, y, coal.size, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const coal of coals) {
        const x = hx + coal.offset * hearthSpread();
        const y = hy + coal.y;
        const flicker = 0.18 + (Math.sin(elapsed * coal.speed + coal.phase) * 0.5 + 0.5) * 0.3;
        const size = coal.size * 3.2;
        ctx.globalAlpha = flicker;
        ctx.drawImage(sprites.flames[coal.tone > 0.65 ? 2 : 3], x - size / 2, y - size / 2, size, size * 0.62);
      }

      for (const particle of particles) {
        if (particle.kind !== 'flame') continue;
        const t = particle.age / particle.life;
        const envelope = Math.sin(t * Math.PI);
        const size = particle.size * (0.72 + envelope * 0.64);
        const spriteIndex = Math.min(3, Math.floor(t * 3.25 + particle.tone * 0.35));
        ctx.globalAlpha = envelope * (0.54 + particle.tone * 0.34);
        ctx.drawImage(
          sprites.flames[spriteIndex],
          particle.x - size * 0.38,
          particle.y - size * 0.92,
          size * 0.76,
          size * 1.84
        );
      }

      ctx.lineCap = 'round';
      for (const particle of particles) {
        if (particle.kind !== 'wisp') continue;
        const t = particle.age / particle.life;
        const length = particle.size * (0.8 + t * 0.8);
        const sway = Math.sin(elapsed * particle.turbulence + particle.phase) * length * 0.28;
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.25;
        ctx.strokeStyle = particle.tone > 0.55 ? '#ef9b63' : '#b96b4c';
        ctx.lineWidth = 0.55 + particle.tone * 0.7;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.bezierCurveTo(
          particle.x + sway,
          particle.y - length * 0.3,
          particle.x - sway * 0.7,
          particle.y - length * 0.72,
          particle.x + sway * 0.35,
          particle.y - length
        );
        ctx.stroke();
      }

      for (const particle of particles) {
        if (particle.kind !== 'spark') continue;
        const t = particle.age / particle.life;
        ctx.globalAlpha = (1 - t) * 0.92;
        ctx.strokeStyle = particle.tone > 0.58 ? '#ffe6a0' : '#ff963c';
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.vx * 0.026, particle.y - particle.vy * 0.026);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
        ctx.fillStyle = '#fff1b8';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(0.35, particle.size * 0.52), 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = interfaceShade;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = topShade;
      ctx.fillRect(0, 0, width, Math.min(180, height * 0.3));
      ctx.fillStyle = bottomShade;
      ctx.fillRect(0, height - Math.min(170, height * 0.32), width, Math.min(170, height * 0.32));
      frame++;
    }

    function resetSimulation() {
      particles.length = 0;
      elapsed = 0;
      burstCount = 0;
      lastBurst = null;
      expiredCount = 0;
      nextParticleId = 1;
      lastTime = 0;
      for (const kind of KINDS) emission[kind] = 0;
      createCoals();
      seedParticles();
      updateFormLabel();
      draw();
    }

    function resize() {
      const previousWidth = width;
      const previousHeight = height;
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      configureCapacity();

      background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#100e0d');
      background.addColorStop(0.55, '#171311');
      background.addColorStop(1, '#24150f');
      interfaceShade = ctx.createLinearGradient(0, 0, width, 0);
      interfaceShade.addColorStop(0, 'rgba(18,15,14,0.7)');
      interfaceShade.addColorStop(width < 700 ? 0.48 : 0.32, 'rgba(18,15,14,0.24)');
      interfaceShade.addColorStop(0.76, 'rgba(18,15,14,0)');
      topShade = ctx.createLinearGradient(0, 0, 0, Math.min(180, height * 0.3));
      topShade.addColorStop(0, 'rgba(16,14,13,0.74)');
      topShade.addColorStop(1, 'rgba(16,14,13,0)');
      const bottomHeight = Math.min(170, height * 0.32);
      bottomShade = ctx.createLinearGradient(0, height - bottomHeight, 0, height);
      bottomShade.addColorStop(0, 'rgba(18,14,12,0)');
      bottomShade.addColorStop(1, 'rgba(18,14,12,0.8)');

      if (!initialized) {
        initialized = true;
        resetSimulation();
        return;
      }
      const scaleX = width / previousWidth;
      const scaleY = height / previousHeight;
      for (const particle of particles) {
        particle.x *= scaleX;
        particle.y *= scaleY;
      }
      if (particles.length > maxParticles) particles.splice(0, particles.length - maxParticles);
      draw();
    }

    function retireParticle(index) {
      particles[index] = particles[particles.length - 1];
      particles.pop();
      expiredCount++;
    }

    function updateParticle(particle, dt) {
      const wave = Math.sin(elapsed * particle.turbulence + particle.phase);
      const crossWave = Math.cos(elapsed * (particle.turbulence * 0.63) + particle.phase * 1.7);
      if (particle.kind === 'flame') {
        particle.vx += (wave * 23 + crossWave * 9) * dt;
        particle.vx *= Math.exp(-dt * 1.25);
        particle.vy -= (7 + particle.tone * 15) * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      } else if (particle.kind === 'smoke') {
        particle.x += (particle.vx + wave * 15 + crossWave * 6) * dt;
        particle.y += particle.vy * dt;
      } else if (particle.kind === 'spark') {
        particle.vx += wave * 8 * dt;
        particle.vy += 29 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      } else {
        particle.x += (particle.vx + wave * 20) * dt;
        particle.y += particle.vy * dt;
      }
    }

    function emitParticles(dt) {
      for (const kind of KINDS) {
        emission[kind] += rates[kind] * dt;
        const count = Math.floor(emission[kind]);
        if (count < 1) continue;
        emission[kind] -= count;
        for (let index = 0; index < count; index++) {
          if (!spawnParticle(kind)) {
            emission[kind] = 0;
            break;
          }
        }
      }
    }

    function update(dt) {
      elapsed += dt;
      for (let index = particles.length - 1; index >= 0; index--) {
        const particle = particles[index];
        particle.age += dt;
        if (
          particle.age >= particle.life ||
          particle.y < -180 ||
          particle.y > height + 180 ||
          particle.x < -220 ||
          particle.x > width + 220
        ) {
          retireParticle(index);
          continue;
        }
        updateParticle(particle, dt);
      }
      emitParticles(dt);
    }

    function addBurst(x, y) {
      const px = clamp(x, 0, width);
      const py = clamp(y, 0, height);
      const count = Math.min(maxParticles, width < 600 ? 28 : 44);
      const overflow = particles.length + count - maxParticles;
      if (overflow > 0) particles.splice(0, overflow);
      for (let index = 0; index < count; index++) {
        const phase = index % 12;
        const kind = phase < 6 ? 'spark' : (phase < 10 ? 'flame' : (phase === 10 ? 'smoke' : 'wisp'));
        spawnParticle(kind, px + (random() - 0.5) * 9, py + (random() - 0.5) * 9, true);
      }
      burstCount++;
      lastBurst = { x: px, y: py, particleCount: count, index: burstCount };
      updateFormLabel();
      draw();
    }

    function updateButton() {
      if (!isActive()) return;
      const text = paused ? 'Resume motion' : 'Pause motion';
      if (label) label.textContent = text;
      if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
    }

    let manuallyPaused = false;

    function setPaused(value, manual = true) {
      paused = Boolean(value);
      if (manual) manuallyPaused = paused;
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
      update(dt);
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
      return Boolean(
        target &&
        typeof target.closest === 'function' &&
        target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]')
      );
    }

    function isEditableTarget(target) {
      return Boolean(
        target &&
        typeof target.closest === 'function' &&
        target.closest('input, select, textarea, [role="textbox"], [contenteditable="true"]')
      );
    }

    listenActive('pointerdown', (event) => {
      if (event.button !== 0 || isInterfaceTarget(event.target)) return;
      event.preventDefault();
      addBurst(event.clientX, event.clientY);
    }, { passive: false });

    listenActive('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
      const space = event.key === ' ' || event.key === 'Spacebar';
      const nativeActivation = event.key === 'Enter' || space;
      if (nativeActivation && isInterfaceTarget(event.target)) return;
      if (event.repeat && space) return;
      let handled = true;
      if (event.key === 'b' || event.key === 'B' || event.key === 'Enter') {
        addBurst(width * (width < 700 ? 0.56 : 0.62), height * 0.48);
      } else if (event.key === 'r' || event.key === 'R') {
        resetSimulation();
      } else if (space) {
        setPaused(!paused);
      } else {
        handled = false;
      }
      if (handled) event.preventDefault();
    });

    button.addEventListener('click', () => {
      if (isActive()) setPaused(!paused);
    });
    if (resetButton) resetButton.addEventListener('click', () => {
      if (isActive()) resetSimulation();
    });
    document.addEventListener('visibilitychange', syncAnimation);

    function motionPreferenceChanged(event) {
      if (event.matches) setPaused(true, false);
      else if (!manuallyPaused) setPaused(false, false);
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionPreferenceChanged);
    else motionQuery.addListener(motionPreferenceChanged);

    function countKind(kind) {
      let count = 0;
      for (const particle of particles) if (particle.kind === kind) count++;
      return count;
    }

    canvas.style.touchAction = 'none';
    listenActive('resize', resize, { passive: true });
    window.emberArt = {
      get frame() { return frame; },
      get paused() { return paused; },
      get active() { return isActive(); },
      get scheduled() { return animationRequest !== null; },
      get reducedMotion() { return motionQuery.matches; },
      get particleCount() { return particles.length; },
      get maxParticles() { return maxParticles; },
      get burstCount() { return burstCount; },
      get expiredCount() { return expiredCount; },
      get elapsed() { return elapsed; },
      get width() { return width; },
      get height() { return height; },
      get dpr() { return dpr; },
      get flameCount() { return countKind('flame'); },
      get smokeCount() { return countKind('smoke'); },
      get sparkCount() { return countKind('spark'); },
      get wispCount() { return countKind('wisp'); },
      get lastBurst() { return lastBurst ? { ...lastBurst } : null; },
      get particles() {
        return particles.map((particle) => ({
          id: particle.id,
          kind: particle.kind,
          x: particle.x,
          y: particle.y,
          vx: particle.vx,
          vy: particle.vy,
          age: particle.age,
          life: particle.life,
          size: particle.size
        }));
      }
    };

    createSprites();
    updateFormLabel();
    updateButton();
    resize();
    gallery.subscribe((id) => {
      if (id === 'ember') {
        updateButton();
        resize();
      }
      syncAnimation();
    });
    syncAnimation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
