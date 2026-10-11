'use strict';

(() => {
  const sections = [...document.querySelectorAll('.letter-section')];
  const rail = document.querySelector('.letter-rail');
  if (!rail || !sections.length) return;
  const links = [...rail.querySelectorAll('a')];
  let pending = false;

  function updatePosition() {
    pending = false;
    const visible = sections.filter(section => !section.hidden);
    const threshold = innerWidth <= 700 ? 150 : 100;
    let current = visible[0];
    for (const section of visible) {
      if (section.getBoundingClientRect().top <= threshold) current = section;
      else break;
    }
    for (const link of links) {
      if (current && link.dataset.letter === current.dataset.letter) {
        link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    }
    rail.hidden = !visible.length;
  }

  function updateMatches() {
    for (const section of sections) {
      section.hidden = !section.querySelector('.site-card:not(.hidden)');
      const link = links.find(link => link.dataset.letter === section.dataset.letter);
      link.hidden = section.hidden;
    }
    updatePosition();
  }

  rail.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const section = sections.find(section => section.dataset.letter === link.dataset.letter);
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: 'instant', block: 'start' });
    history.replaceState(null, '', link.getAttribute('href'));
    updatePosition();
  });

  const observer = new MutationObserver(updateMatches);
  for (const card of document.querySelectorAll('.site-card')) {
    observer.observe(card, { attributes: true, attributeFilter: ['class'] });
  }
  window.addEventListener('scroll', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(updatePosition);
    }
  }, { passive: true });
  window.addEventListener('resize', updatePosition);
  updateMatches();
})();
