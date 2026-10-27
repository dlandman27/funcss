'use strict';
// Hero easter eggs: console banner, rotating headline word, and a five-click
// logo spin. Homepage only.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const award = (id) => { if (window.rswAward) window.rswAward(id); };

  // ---- Console banner + commands ------------------------------------------
  // Columns per row: random | sites  /  on | the | web, colored like the logo.
  const ASCII = [["                      _                 ","      _ _            "],
    ["  _ __ __ _ _ __   __| | ___  _ __ ___  ","  ___(_) |_ ___  ___ "],
    [" | '__/ _` | '_ \\ / _` |/ _ \\| '_ ` _ \\ "," / __| | __/ _ \\/ __|"],
    [" | | | (_| | | | | (_| | (_) | | | | | |"," \\__ \\ | ||  __/\\__ \\"],
    [" |_|  \\__,_|_| |_|\\__,_|\\___/|_| |_| |_|"," |___/_|\\__\\___||___/"],
    ["              ","  _   _          ","               _     "],
    ["   ___  _ __  "," | |_| |__   ___ "," __      _____| |__  "],
    ["  / _ \\| '_ \\ "," | __| '_ \\ / _ \\"," \\ \\ /\\ / / _ \\ '_ \\ "],
    [" | (_) | | | |"," | |_| | | |  __/","  \\ V  V /  __/ |_) |"],
    ["  \\___/|_| |_|","  \\__|_| |_|\\___|","   \\_/\\_/ \\___|_.__/ "]];
  const COLORS = ['#f47b28', '#5aa0db', '#a98fd0', '#8a8580', '#b7ce3c'];
  const font = 'font-family: monospace; font-weight: bold; line-height: 1.1;';
  const parts = [];
  const styles = [];
  ASCII.forEach((cols, row) => {
    const offset = row < 5 ? 0 : 2; // second block starts at "on"
    cols.forEach((text, i) => { parts.push('%c' + text); styles.push(font + 'color:' + COLORS[offset + i]); });
    parts.push('\n');
  });
  console.log(parts.join(''), ...styles);
  console.log(
    '%cpsst. you look like someone who reads source code.\n%cTry typing:  surprise()   disco()   credits()   seasons()',
    'font-size: 13px; font-weight: bold;',
    'font-size: 12px; font-family: monospace; color: #5aa0db;'
  );
  let snooped = false;
  const snoop = () => { if (!snooped) { snooped = true; award('snoop'); } };
  window.surprise = () => {
    snoop();
    const btn = document.getElementById('surpriseBtn');
    if (btn) btn.click();
    return 'buckle up';
  };
  window.disco = () => {
    snoop();
    if (window.rswDisco) window.rswDisco();
    return '🪩';
  };
  window.credits = () => {
    snoop();
    const count = document.querySelectorAll('.site-card').length;
    console.log(
      '%cRandom Sites On the Web%c\n' + count + ' tiny websites, hand-made by Dylan Landman.\nhttps://dylanlandman.com\n\nThanks for poking around. There are more secrets on the page.',
      'font-size: 16px; font-weight: bold; color: #f47b28;', 'font-size: 12px;'
    );
    return '♥';
  };

  const hero = document.getElementById('top');
  const logo = document.querySelector('#top .logo-img');
  const tilt = document.querySelector('#top .logo-tilt');
  if (!hero || !logo || !tilt) return;

  // ---- Rotating headline word ----------------------------------------------
  // The inline script after the <h1> already stacked every word in one grid
  // cell (so swapping never shifts the layout); this just cycles them.
  const wordBox = document.querySelector('#top .hero-word');
  if (wordBox && !reduceMotion) {
    const words = [...wordBox.querySelectorAll('.hero-word__item')];
    const RARE = words.findIndex(w => w.dataset.rare);
    let current = 0, timer = 0;
    function show(next) {
      words[current].classList.remove('is-active');
      words[next].classList.add('is-active');
      current = next;
      if (next === RARE) award('wordsmith');
    }
    function step() {
      // The rare word shows up roughly once every 30 swaps.
      if (RARE >= 0 && Math.random() < 1 / 30) return show(RARE);
      let next = (current + 1) % words.length;
      if (next === RARE) next = (next + 1) % words.length;
      show(next);
    }
    const start = () => { clearInterval(timer); timer = setInterval(step, 2600); };
    start();
    wordBox.addEventListener('click', () => { step(); start(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(timer); else start();
    });
  }

  // ---- Five quick clicks on the logo: it spins off and pops back ------------
  let clicks = [], downAt = null;
  logo.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  logo.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const quick = performance.now() - downAt.t < 300;
    downAt = null;
    if (moved > 6 || !quick) return; // a drag, not a click
    const now = performance.now();
    clicks = clicks.filter(t => now - t < 2500);
    clicks.push(now);
    if (clicks.length < 5) return;
    clicks = [];
    spin();
  });

  function spin() {
    if (tilt.classList.contains('is-spinning')) return;
    award('dizzy');
    if (reduceMotion) return;
    tilt.classList.add('is-spinning');
    const r = logo.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2);
    setTimeout(() => tilt.classList.remove('is-spinning'), 1400);
  }

  function confetti(x, y) {
    const colors = ['#f47b28', '#5aa0db', '#a98fd0', '#b7ce3c', '#f0563e', '#f7c948'];
    for (let i = 0; i < 40; i++) {
      const bit = document.createElement('span');
      bit.className = 'hero-confetti';
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 220;
      bit.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + colors[i % colors.length] +
        ';--dx:' + (Math.cos(angle) * dist).toFixed(0) + 'px;--dy:' + (Math.sin(angle) * dist - 80).toFixed(0) + 'px' +
        ';--r:' + (Math.random() * 720 - 360).toFixed(0) + 'deg';
      document.body.appendChild(bit);
      setTimeout(() => bit.remove(), 1300);
    }
  }

  // ---- The golden page: roughly 1 visit in 500 (preview with ?golden) --------
  const forceGolden = new URLSearchParams(location.search).has('golden');
  if (forceGolden || Math.random() < 1 / 500) {
    document.documentElement.classList.add('is-golden');
    const banner = document.createElement('p');
    banner.className = 'golden-banner';
    banner.textContent = '✨ You found the golden page. Only 1 in 500 visits look like this. ✨';
    hero.querySelector('.hero-center').prepend(banner);
    award('golden');
    if (!reduceMotion) {
      setTimeout(() => {
        const r = logo.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2);
      }, 600);
    }
  }

  // ---- Shake your phone to Surprise Me ----------------------------------------
  // Works wherever motion events need no permission prompt (Android browsers).
  // iOS gates motion behind a permission dialog, which isn't worth a prompt here.
  const needsPermission = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  if ('ondevicemotion' in window && !needsPermission) {
    let lastShake = 0, shakes = 0, last = null;
    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null) return;
      if (last) {
        const jolt = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
        const now = Date.now();
        if (jolt > 30) {
          shakes = now - lastShake < 800 ? shakes + 1 : 1;
          lastShake = now;
          if (shakes >= 3) { shakes = 0; shakeToSurprise(); }
        }
      }
      last = { x: a.x, y: a.y, z: a.z };
    });
  }
  let shaking = false;
  function shakeToSurprise() {
    const btn = document.getElementById('surpriseBtn');
    if (shaking || !btn || hero.getBoundingClientRect().bottom < 0) return;
    shaking = true;
    award('shaker');
    btn.classList.add('is-rolling');
    setTimeout(() => btn.click(), 650);
  }
})();
