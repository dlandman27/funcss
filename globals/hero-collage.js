'use strict';
(() => {
  const collage = document.querySelector('.hero-collage');
  if (!collage) return;
  const cards = [...document.querySelectorAll('.site-grid .site-card.has-image')];
  // Spread the alphabet through both rows so nearby cards have varied artwork.
  const rows = [[], []];
  const sample = cards.filter((_, index) => index % Math.max(1, Math.floor(cards.length / 16)) === 0).slice(0, 16);
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
      const link = document.createElement('div');
      link.className = 'hero-tile';
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
