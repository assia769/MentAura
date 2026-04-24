// ════════════════════════════════════════════════════════════════════
// 🌌 MENTAURA — LANDING INTERACTIONS
// Works standalone (vanilla) AND as Angular component methods
// ════════════════════════════════════════════════════════════════════

// ─── Tab Switch ────────────────────────────────────────────────────
function switchTab(tab) {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin     = document.getElementById('tabLogin');
  const tabRegister  = document.getElementById('tabRegister');
  const indicator    = document.getElementById('tabIndicator');
  const cardTitle    = document.getElementById('cardTitle');
  const cardRoman    = document.getElementById('cardRoman');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    indicator.classList.remove('right');
    cardTitle.textContent = 'WELCOME';
    cardRoman.textContent = 'I';
  } else {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    indicator.classList.add('right');
    cardTitle.textContent = 'JOIN US';
    cardRoman.textContent = 'II';
  }
}

// ─── Password Toggle ───────────────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '◉' : '○';
  btn.style.color = isHidden ? 'var(--cyan)' : '';
}

// ─── Password Strength ─────────────────────────────────────────────
function checkStrength(input) {
  const v = input.value;
  let score = 0;
  if (v.length >= 8)           score++;
  if (/[A-Z]/.test(v))        score++;
  if (/[0-9]/.test(v))        score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  const pcts   = [0, 28, 55, 80, 100];
  const colors = ['transparent', '#FF4D6D', '#FF9500', '#00EFAA', '#00EFFF'];

  const fill = document.getElementById('strengthFill');
  if (fill) {
    fill.style.width      = pcts[score] + '%';
    fill.style.background = colors[score];
  }
}

// ─── Error helper ──────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}

// ─── Mock Login ────────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('loginEmail')?.value;
  const pw    = document.getElementById('loginPw')?.value;
  if (!email || !pw) { showError('loginError', 'Please fill in all fields.'); return; }
  // Replace with real AuthService call in Angular
  console.log('Login attempt:', email);
}

// ─── Mock Register ─────────────────────────────────────────────────
function handleRegister() {
  const pw  = document.getElementById('regPw')?.value;
  if (!pw || pw.length < 8) { showError('registerError', 'Password must be at least 8 characters.'); return; }
  // Replace with real AuthService call in Angular
  console.log('Register attempt');
}

// ─── Tilt Card (Mouse Tracking) ────────────────────────────────────
(function initTilt() {
  const card = document.getElementById('authCard');
  if (!card) return;

  document.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) / (window.innerWidth  / 2);
    const dy   = (e.clientY - cy) / (window.innerHeight / 2);

    const tiltX =  dy * 6;   // max 6deg
    const tiltY = -dx * 6;

    card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

    // Move subtle inner highlight
    const xPct = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const yPct = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', xPct + '%');
    card.style.setProperty('--my', yPct + '%');
  });

  document.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  });
})();

// ─── Canvas Background ─────────────────────────────────────────────
(function initCanvas() {
  const canvas = document.querySelector('.bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  const resize = () => {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Nebula orbs
  const orbs = [
    { x: .12, y: .22, r: 320, phase: 0,   c: [0, 239, 255], c2: [123, 47, 255] },
    { x: .85, y: .7,  r: 260, phase: 2.1, c: [255, 45, 120], c2: [123, 47, 255] },
    { x: .5,  y: .02, r: 200, phase: 4.5, c: [0, 239, 255],  c2: [0,  239, 170] },
    { x: .08, y: .85, r: 180, phase: 1.8, c: [123, 47, 255], c2: [0,  239, 255] },
  ];

  // Particles
  const pts = Array.from({ length: 130 }, () => ({
    x:  Math.random() * 1920,
    y:  Math.random() * 1080,
    vx: (Math.random() - .5) * .15,
    vy: (Math.random() - .5) * .15,
    r:  Math.random() * 1.4 + .3,
    ph: Math.random() * Math.PI * 2,
  }));

  const frame = () => {
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, W, H);
    t += .003;

    orbs.forEach(o => {
      const px = (o.x + Math.sin(t + o.phase) * .07) * W;
      const py = (o.y + Math.cos(t * 1.2 + o.phase) * .06) * H;
      const sc = .85 + Math.sin(t * 1.5 + o.phase) * .15;

      for (let i = 3; i > 0; i--) {
        const rad = o.r * sc * (i / 2.5);
        const g   = ctx.createRadialGradient(px, py, 0, px, py, rad);
        const a   = (.12 / i) + Math.sin(t + o.phase) * (.04 / i);
        g.addColorStop(0, `rgba(${o.c.join(',')},${a})`);
        g.addColorStop(.6, `rgba(${o.c2.join(',')},${a * .2})`);
        g.addColorStop(1,  `rgba(${o.c2.join(',')},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      const pulse = Math.sin(t * 2.5 + p.ph) * .5 + .5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (.6 + pulse * .4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,184,216,${.03 + pulse * .06})`;
      ctx.fill();
    });

    // Connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < Math.min(i + 12, pts.length); j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) {
          const alpha = (1 - d / 110) * .07;
          ctx.strokeStyle = `rgba(0,239,255,${alpha})`;
          ctx.lineWidth   = .5;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(frame);
  };
  frame();
})();