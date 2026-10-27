'use strict';
// Seasonal decorations for the homepage hero. Every day of the year matches a
// season; holidays are listed first so they win over the season they fall in.
// Decorations only add to the page. Preview any season with ?season=<name>,
// or type seasons() in the console for the full calendar.
// Must load after hero-collage.js (adds tiles) and before hero-fun.js (adds words).
(() => {
  const SITE_BORN = 2024; // first commit: Dec 16, 2024

  // ---- Logo hats ---------------------------------------------------------------
  const HATS = {
    party: '<svg viewBox="0 0 80 100"><path d="M40 8 8 90h64z" fill="#a98fd0" stroke="#201a17" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M30 34h20M22 56h36M14 78h52" stroke="#f7c948" stroke-width="7"/><path d="M40 8 8 90h64z" fill="none" stroke="#201a17" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="40" cy="9" r="9" fill="#f0563e" stroke="#201a17" stroke-width="3.5"/></svg>',
    santa: '<svg viewBox="0 0 110 90"><path d="M14 70C20 30 44 6 70 10c18 3 28 22 30 42l-16 6c-2-14-6-24-14-26-14 10-26 26-30 40z" fill="#e63a2e" stroke="#201a17" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="6" y="62" width="74" height="20" rx="10" fill="#fefaf0" stroke="#201a17" stroke-width="4"/><circle cx="92" cy="62" r="12" fill="#fefaf0" stroke="#201a17" stroke-width="4"/></svg>',
    leprechaun: '<svg viewBox="0 0 110 90"><path d="M28 70 34 14h44l6 56z" fill="#2f8a4a" stroke="#201a17" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="6" y="66" width="98" height="16" rx="8" fill="#2f8a4a" stroke="#201a17" stroke-width="4"/><path d="M31 46h50v12H31z" fill="#201a17"/>' +
      '<rect x="48" y="44" width="16" height="16" rx="2" fill="#f7c948" stroke="#201a17" stroke-width="3"/></svg>',
    pirate: '<svg viewBox="0 0 120 80"><path d="M6 60c10-40 98-40 108 0-18-8-36-10-54-10S24 52 6 60z" fill="#201a17"/>' +
      '<path d="M8 60c18-6 34-8 52-8s34 2 52 8" fill="none" stroke="#f7c948" stroke-width="4"/>' +
      '<circle cx="60" cy="32" r="7" fill="#fefaf0"/><path d="M52 44l16-6M52 38l16 6" stroke="#fefaf0" stroke-width="3.5" stroke-linecap="round"/></svg>',
  };

  // ---- Halloween extras ---------------------------------------------------------
  const PUMPKIN =
    '<svg viewBox="0 0 100 100"><path d="M48 22c0-8 3-13 9-15l3 4c-5 2-6 6-6 11z" fill="#4f7a28"/>' +
    '<g stroke="#201a17" stroke-width="3"><ellipse cx="50" cy="58" rx="40" ry="32" fill="#f47b28"/>' +
    '<path d="M50 26c-12 0-17 14-17 32s5 32 17 32M50 26c12 0 17 14 17 32s-5 32-17 32" fill="none"/></g>' +
    '<g fill="#ffd34d"><path d="M28 50l10-12 10 12zM52 50l10-12 10 12z"/>' +
    '<path d="M26 64c8 10 40 10 48 0l-6 9-6-5-6 6-6-6-6 6-6-6-6 5z"/></g></svg>';
  const BAT =
    '<svg viewBox="0 0 64 28"><path fill="#201a17" d="M32 9c2-4 5-4 6 0 6-6 16-8 26-4-6 2-9 7-9 12-4-3-9-3-12 1-2-3-6-4-9-2-3-2-7-1-9 2-3-4-8-4-12-1 0-5-3-10-9-12 10-4 20-2 26 4 1-4 4-4 6 0z"/></svg>';

  // ---- Date helpers -------------------------------------------------------------
  const md = (d) => (d.getMonth() + 1) * 100 + d.getDate();
  const between = (from, to) => (d) => {
    const v = md(d);
    return from <= to ? v >= from && v <= to : v >= from || v <= to; // wraps over New Year
  };
  const on = (date) => between(date, date);
  function thanksgiving(year) { // 4th Thursday of November
    const first = new Date(year, 10, 1).getDay();
    return new Date(year, 10, 1 + ((4 - first + 7) % 7) + 21);
  }

  // ---- The calendar (first match wins) ------------------------------------------
  // particles: { chars, mode: fall | rise | twinkle, count }   flyer: { html, path: sky | ground }
  const SEASONS = [
    { name: 'april-fools', label: 'April Fools', when: on(401), cursor: '🤡', words: ['Serious', 'Boring'], colors: ['#f7c948', '#201a17'], flip: true },
    { name: 'friday-13th', label: 'Friday the 13th', when: (d) => d.getDay() === 5 && d.getDate() === 13, cursor: '🐈‍⬛', words: ['Unlucky', 'Cursed'], colors: ['#201a17', '#f7c948'],
      flyer: { html: '<span class="season-emoji">🐈‍⬛</span>', path: 'ground' }, tint: 'rgba(32,26,23,.10)' },
    { name: 'pi-day', label: 'Pi Day', when: on(314), cursor: '🥧', words: ['Infinite', 'Circular'], colors: ['#a98fd0', '#201a17'],
      particles: { chars: ['π', '3', '1', '4', '1', '5', '9', '2', '6'], mode: 'fall', count: 24, text: true }, tile: { emoji: '🥧', bg: '#a98fd0' } },
    { name: 'leap-day', label: 'Leap Day', when: on(229), cursor: '🐸', words: ['Bonus', 'Leaping'], colors: ['#b7ce3c', '#201a17'],
      particles: { chars: ['🐸'], mode: 'twinkle', count: 8 } },
    { name: 'star-wars', label: 'Star Wars Day', when: on(504), cursor: '🛸', words: ['Galactic', 'Stellar'], colors: ['#201a17', '#f7c948'],
      particles: { chars: ['✦', '✧', '⋆'], mode: 'twinkle', count: 36, text: true }, flyer: { html: '<span class="season-emoji">🛸</span>', path: 'sky' }, tint: 'rgba(43,29,58,.12)' },
    { name: 'earth-day', label: 'Earth Day', when: on(422), cursor: '🌱', words: ['Green', 'Earthy'], colors: ['#2f8a4a', '#fefaf0'],
      particles: { chars: ['🌱', '🍃'], mode: 'fall', count: 16 }, tile: { emoji: '🌍', bg: '#5aa0db' } },
    { name: 'pirate-day', label: 'Talk Like a Pirate Day', when: on(919), cursor: '🦜', words: ['Salty', 'Piratey'], colors: ['#201a17', '#f7c948'],
      hat: 'pirate', tile: { emoji: '🏴‍☠️', bg: '#3f6f9c' } },
    { name: 'site-birthday', label: 'Site Birthday', when: on(1216), cursor: '🥳', words: ['Birthday', 'Partying'], colors: ['#ff7fa5', '#201a17'],
      hat: 'party', fireworks: true, particles: { chars: ['🎈', '🎈', '🎉'], mode: 'rise', count: 12 }, tile: { emoji: '🎂', bg: '#ff7fa5' } },
    { name: 'new-year', label: "New Year's", when: between(1231, 102), cursor: '🥂', words: ['Brand-New', 'Fresh'], colors: ['#f7c948', '#201a17'],
      hat: 'party', fireworks: true, particles: { chars: ['🎊', '✨'], mode: 'fall', count: 18 }, tile: { emoji: '🎆', bg: '#2b1d3a' } },
    { name: 'valentines', label: "Valentine's Day", when: between(207, 214), cursor: '💘', words: ['Lovely', 'Sweet'], colors: ['#ff7fa5', '#201a17'],
      particles: { chars: ['💖', '💕', '💗'], mode: 'rise', count: 18 }, tile: { emoji: '💝', bg: '#ff7fa5' }, tint: 'rgba(255,127,165,.12)' },
    { name: 'st-patricks', label: "St. Patrick's Day", when: between(315, 317), cursor: '🍀', words: ['Lucky', 'Golden'], colors: ['#2f8a4a', '#f7c948'],
      hat: 'leprechaun', particles: { chars: ['☘️', '🍀', '🪙'], mode: 'fall', count: 18 }, tile: { emoji: '🌈', bg: '#2f8a4a' } },
    { name: 'july-4', label: 'Fourth of July', when: between(701, 704), cursor: '🎆', words: ['Sparkly', 'Explosive'], colors: ['#5aa0db', '#fefaf0'],
      fireworks: true, particles: { chars: ['✨'], mode: 'twinkle', count: 14 }, tile: { emoji: '🎆', bg: '#2b3a6b' } },
    { name: 'thanksgiving', label: 'Thanksgiving', when: (d) => { const t = thanksgiving(d.getFullYear()); const diff = (d - t) / 864e5; return diff >= -3 && diff < 2; },
      cursor: '🦃', words: ['Grateful', 'Stuffed'], colors: ['#c8692a', '#fefaf0'], particles: { chars: ['🍂', '🍁', '🌽'], mode: 'fall', count: 16 }, tile: { emoji: '🦃', bg: '#c8692a' } },
    { name: 'halloween', label: 'Halloween', when: between(1025, 1031), cursor: '👻', words: ['Haunted', 'Spooky'], colors: ['#2b1d3a', '#f47b28'],
      tile: { html: PUMPKIN, bg: 'radial-gradient(circle at 50% 60%, #5b3a7a, #2b1d3a)' }, flyer: { html: BAT, path: 'sky', flap: true }, spider: true, tint: 'rgba(91,58,122,.14)' },
    { name: 'christmas', label: 'Christmas', when: between(1201, 1230), cursor: '⛄', words: ['Merry', 'Jolly'], colors: ['#e63a2e', '#fefaf0'],
      hat: 'santa', particles: { chars: ['❄️', '❄️', '❅'], mode: 'fall', count: 30 }, tile: { emoji: '🎄', bg: '#2f6b3a' },
      flyer: { html: '<span class="season-emoji">🛷🦌🦌</span>', path: 'sky' } },
    { name: 'back-to-school', label: 'Back to School', when: between(901, 910), cursor: '✏️', words: ['Studious', 'Nerdy'], colors: ['#f7c948', '#201a17'],
      hatEmoji: '🎓', particles: { chars: ['✏️', '📚', '📐'], mode: 'fall', count: 12 }, tile: { emoji: '🍎', bg: '#f0563e' } },
    { name: 'winter', label: 'Winter', when: between(103, 319), cursor: '🧤', words: ['Frosty', 'Snowy'], colors: ['#5aa0db', '#fefaf0'],
      particles: { chars: ['❄️', '❅'], mode: 'fall', count: 16 }, tile: { emoji: '☃️', bg: '#5aa0db' } },
    { name: 'spring', label: 'Spring', when: between(320, 620), cursor: '🐝', words: ['Blooming', 'Fresh'], colors: ['#ff7fa5', '#201a17'],
      particles: { chars: ['🌸', '🌸', '🌼'], mode: 'fall', count: 12 }, tile: { emoji: '🌷', bg: '#b7ce3c' }, flyer: { html: '<span class="season-emoji">🦋</span>', path: 'sky' } },
    { name: 'summer', label: 'Summer', when: between(621, 921), cursor: '😎', words: ['Sunny', 'Breezy'], colors: ['#f7c948', '#201a17'],
      particles: { chars: ['🫧'], mode: 'rise', count: 10 }, tile: { emoji: '🍉', bg: '#2fb0a3' } },
    { name: 'autumn', label: 'Autumn', when: between(922, 1130), cursor: '🍂', words: ['Cozy', 'Crunchy'], colors: ['#c8692a', '#fefaf0'],
      particles: { chars: ['🍂', '🍁'], mode: 'fall', count: 14 }, tile: { emoji: '🍁', bg: '#c8692a' } },
  ];

  window.seasons = () => {
    console.table(SEASONS.map((s) => ({ season: s.label, preview: location.pathname + '?season=' + s.name })));
    return active ? 'Right now: ' + active.label : 'No season right now';
  };

  const forced = new URLSearchParams(location.search).get('season');
  const today = new Date();
  const active = SEASONS.find((s) => s.name === forced) || SEASONS.find((s) => s.when(today));
  const hero = document.getElementById('top');
  if (!active || !hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 820px)').matches;
  const root = document.documentElement;
  root.classList.add('season-' + active.name);
  root.dataset.season = active.name;
  if (active.cursor) root.style.setProperty('--season-cursor', JSON.stringify(active.cursor));
  if (active.tint) root.style.setProperty('--season-tint', active.tint);
  if (active.colors) {
    root.style.setProperty('--season-a', active.colors[0]);
    root.style.setProperty('--season-b', active.colors[1]);
  }

  const el = (cls, html, tag) => {
    const node = document.createElement(tag || 'span');
    node.className = cls;
    node.setAttribute('aria-hidden', 'true');
    if (html) node.innerHTML = html;
    return node;
  };
  const tilt = document.querySelector('#top .logo-tilt');

  // ---- Headline stickers (hero-fun.js picks them up) ----------------------------
  const wordBox = document.querySelector('#top .hero-word');
  if (wordBox && active.words) {
    active.words.forEach((word) => {
      const item = el('hero-word__item');
      item.dataset.season = active.name;
      item.textContent = word;
      wordBox.appendChild(item);
    });
  }

  // ---- Hat on the logo -----------------------------------------------------------
  if (tilt && (active.hat || active.hatEmoji)) {
    tilt.append(active.hat ? el('season-hat season-hat--' + active.hat, HATS[active.hat]) : el('season-hat season-hat--emoji', active.hatEmoji));
  }
  if (active.flip) root.classList.add('season-flip');

  // ---- Themed tiles drifting with the artwork -------------------------------------
  if (active.tile) {
    const content = active.tile.html || '<span class="season-emoji">' + active.tile.emoji + '</span>';
    document.querySelectorAll('.hero-group').forEach((group) => {
      [2, 6].forEach((at) => {
        const tile = el('hero-tile hero-tile--season', content);
        tile.style.background = active.tile.bg;
        group.insertBefore(tile, group.children[at] || null);
      });
    });
  }

  // ---- Halloween spider on a web in the logo's corner ----------------------------
  if (tilt && active.spider) {
    const W = 110, spokes = 6, rings = 5;
    const pt = (r, a) => [W - Math.cos(a) * r, Math.sin(a) * r];
    let d = '';
    for (let i = 0; i < spokes; i++) {
      const [x, y] = pt(W, (i / (spokes - 1)) * Math.PI / 2);
      d += `M${W} 0L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    for (let r = 1; r <= rings; r++) {
      const rad = (W / rings) * r;
      for (let i = 0; i < spokes - 1; i++) {
        const a1 = (i / (spokes - 1)) * Math.PI / 2, a2 = ((i + 1) / (spokes - 1)) * Math.PI / 2;
        const [x1, y1] = pt(rad, a1), [x2, y2] = pt(rad, a2), [cx, cy] = pt(rad * 0.82, (a1 + a2) / 2);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }
    }
    tilt.append(el('spooky-web', `<svg viewBox="0 0 ${W} ${W}"><path d="${d}"/></svg>`));
    const spider = el('spooky-spider',
      '<span class="spooky-spider__thread"></span>' +
      '<svg class="spooky-spider__body" viewBox="0 0 40 34"><g stroke="#201a17" stroke-width="2.2" stroke-linecap="round" fill="none">' +
      '<path d="M14 15 4 8M14 18 2 18M14 21 4 28M15 23 8 32M26 15 36 8M26 18 38 18M26 21 36 28M25 23 32 32"/></g>' +
      '<ellipse cx="20" cy="20" rx="8.5" ry="9.5" fill="#201a17"/><circle cx="20" cy="9.5" r="5.5" fill="#201a17"/>' +
      '<circle cx="17.8" cy="9" r="1.6" fill="#fefaf0"/><circle cx="22.2" cy="9" r="1.6" fill="#fefaf0"/></svg>');
    spider.setAttribute('aria-hidden', 'false');
    spider.setAttribute('role', 'button');
    spider.setAttribute('aria-label', 'Poke the spider');
    spider.addEventListener('pointerdown', (e) => e.stopPropagation()); // not a logo drag
    spider.addEventListener('click', (e) => {
      e.stopPropagation();
      if (spider.classList.contains('is-climbing')) return;
      spider.classList.add('is-climbing');
      if (window.rswAward) window.rswAward('spooked');
      setTimeout(() => spider.classList.remove('is-climbing'), 3200);
    });
    tilt.append(spider);
  }

  if (reduceMotion) return; // everything below moves

  // ---- Particles: falling, rising, or twinkling ------------------------------------
  if (active.particles) {
    const { chars, mode, count, text } = active.particles;
    const sky = el('season-sky', null, 'div');
    const n = Math.round(count * (small ? 0.55 : 1));
    for (let i = 0; i < n; i++) {
      const p = el('season-particle is-' + mode + (text ? ' is-text' : ''));
      p.textContent = chars[i % chars.length];
      const dur = mode === 'twinkle' ? 2 + Math.random() * 3 : 9 + Math.random() * 9;
      p.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;top:${mode === 'twinkle' ? (Math.random() * 90).toFixed(1) + '%' : ''};` +
        `--size:${(14 + Math.random() * 14).toFixed(0)}px;--dur:${dur.toFixed(1)}s;--delay:${(-Math.random() * dur).toFixed(1)}s;` +
        `--sway:${(Math.random() * 60 - 30).toFixed(0)}px;--spin:${(Math.random() * 360 - 180).toFixed(0)}deg`;
      sky.append(p);
    }
    hero.append(sky);
  }

  let inView = true;
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }).observe(hero);
  const live = () => inView && !document.hidden;

  // ---- Something crossing the hero now and then -----------------------------------
  if (active.flyer) {
    const { html, path, flap } = active.flyer;
    (function launch() {
      if (live()) {
        const count = path === 'ground' ? 1 : 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const f = el('season-flyer is-' + path + (flap ? ' is-flapping' : ''), html);
          if (path === 'sky') f.style.top = (8 + Math.random() * 40) + '%';
          f.style.animationDelay = (i * 0.35) + 's';
          f.style.setProperty('--size', (path === 'ground' ? 44 : 26 + Math.random() * 22).toFixed(0) + 'px');
          if (Math.random() < 0.5) f.classList.add('is-reverse');
          hero.append(f);
          setTimeout(() => f.remove(), 11000);
        }
      }
      setTimeout(launch, 8000 + Math.random() * 9000);
    })();
  }

  // ---- Fireworks ---------------------------------------------------------------------
  if (active.fireworks) {
    const colors = ['#f47b28', '#5aa0db', '#a98fd0', '#b7ce3c', '#f0563e', '#f7c948', '#ff7fa5'];
    (function boom() {
      if (live()) {
        const r = hero.getBoundingClientRect();
        const x = (Math.random() < 0.5 ? 0.08 + Math.random() * 0.22 : 0.7 + Math.random() * 0.22) * r.width;
        const y = (0.12 + Math.random() * 0.4) * r.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2, dist = 60 + Math.random() * 40;
          const s = el('season-spark');
          s.style.cssText = `left:${x}px;top:${y}px;background:${color};--dx:${(Math.cos(a) * dist).toFixed(0)}px;--dy:${(Math.sin(a) * dist).toFixed(0)}px`;
          hero.append(s);
          setTimeout(() => s.remove(), 1300);
        }
      }
      setTimeout(boom, 1400 + Math.random() * 2600);
    })();
  }
})();
