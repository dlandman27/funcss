'use strict';
(() => {
  const collage = document.querySelector('.hero-collage');
  if (!collage) return;
  const cards = [...document.querySelectorAll('.site-grid .site-card.has-image')];
  // A fresh random set of artwork on every visit.
  const rows = [[], []];
  const shuffled = cards.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const sample = shuffled.slice(0, 16);
  sample.forEach((card, index) => rows[index % 2].push(card));
  rows.forEach((cards, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'hero-row';
    row.setAttribute('aria-label', `Explore websites, row ${rowIndex + 1}`);
    const track = document.createElement('div');
    track.className = 'hero-track';
    track.style.setProperty('--duration', `${cards.length * 10}s`);
    const group = document.createElement('div');
    group.className = 'hero-group';
    cards.forEach(card => {
      // Tiles are real links for mouse/touch discovery; the catalog below is the
      // accessible way in, so they stay out of the tab order (collage is aria-hidden).
      const link = document.createElement('a');
      link.className = 'hero-tile';
      link.href = card.querySelector('a').getAttribute('href');
      link.tabIndex = -1;
      link.title = (card.querySelector('h2') || {}).textContent || '';
      const image = card.querySelector('.site-image').cloneNode();
      image.removeAttribute('onerror');
      image.removeAttribute('class');
      link.append(image);
      group.append(link);
    });
    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    track.append(group, duplicate);
    row.append(track);
    collage.append(row);
  });
  const hero = document.getElementById('top');
  let inView = true;
  function updatePlayback() {
    collage.classList.toggle('is-paused', !inView || document.hidden);
  }
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    updatePlayback();
  }).observe(hero);
  document.addEventListener('visibilitychange', updatePlayback);
})();
