'use strict';

(() => {
  const sections = [...document.querySelectorAll('.letter-section')];
  const rail = document.querySelector('.letter-rail');
  if (!rail || !sections.length) return;
  const links = [...rail.querySelectorAll('a')];
  const hero = document.getElementById('top');
  const count = document.getElementById('catalogCount');
  const cards = [...document.querySelectorAll('.site-grid .site-card')];
  const searchBar = document.querySelector('.sites-header');
  const empty = document.getElementById('catalogEmpty');
  const ghostLayer = document.getElementById('ghostLayer');
  const footer = document.querySelector('.site-footer');
  const emptyMessage = document.getElementById('catalogEmptyMessage');
  const search = document.getElementById('search');
  const category = document.getElementById('categorySelect');
  document.getElementById('clearCatalogFilters')?.addEventListener('click', () => {
    search.value = '';
    category.value = 'all';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.focus();
  });
  let pending = false;
  let searchVisible = false;
  let searchAnimation;
  let animateSearch;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // The lightweight DOM build uses native browser animations without React.
  import('https://cdn.jsdelivr.net/npm/motion@12.23.24/mini/+esm')
    .then(module => {
      animateSearch = module.animate;
      setupCardMotion();
      const heroCard = document.querySelector('.hero-center');
      if (heroCard && !reducedMotion.matches && heroCard.getBoundingClientRect().bottom > 0) {
        animateSearch(heroCard, {
          opacity: [0, 1],
          transform: ['translateY(22px) scale(0.97)', 'translateY(0px) scale(1)']
        }, { duration: 0.55, ease: [0.22, 1, 0.36, 1] });
      }
    })
    .catch(() => {}); // Keep the search usable if the animation library cannot load.

  function setupCardMotion() {
    let visibilityObserver;
    const animations = new Map();
    const shown = new WeakMap();

    function reveal(card, visible, above = false) {
      if (card.contains(document.activeElement)) visible = true;
      if (shown.get(card) === visible) return;
      const initial = !shown.has(card);
      shown.set(card, visible);
      // Offscreen cards need no entrance/exit animation during setup.
      if (initial && !visible) {
        card.style.opacity = '0';
        return;
      }
      animations.get(card)?.stop();
      animations.set(card, animateSearch(card, visible ? {
        opacity: [0.4, 1, 1],
        translate: ['0px 24px', '0px -4px', '0px 0px'],
        scale: [0.86, 1.035, 1],
        rotate: ['-4deg', '1deg', '0deg']
      } : {
        opacity: 0,
        translate: `0px ${above ? '-20px' : '24px'}`,
        scale: 0.86,
        rotate: above ? '4deg' : '-4deg'
      }, { duration: visible ? 0.48 : 0.24, ease: 'easeOut' }));
    }

    function configure() {
      visibilityObserver?.disconnect();
      for (const card of cards) {
        animations.get(card)?.stop();
        card.style.removeProperty('opacity');
        card.style.removeProperty('translate');
        card.style.removeProperty('scale');
        card.style.removeProperty('rotate');
        shown.delete(card);
      }
      animations.clear();
      if (reducedMotion.matches) return;
      visibilityObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          reveal(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.12,
            entry.boundingClientRect.top < 0);
        }
      }, { rootMargin: '-90px 0px 0px 0px', threshold: [0, 0.12] });
      cards.forEach(card => visibilityObserver.observe(card));
    }

    document.addEventListener('focusin', event => {
      const card = event.target.closest('.site-grid .site-card');
      if (card && !reducedMotion.matches) reveal(card, true);
    });
    reducedMotion.addEventListener('change', configure);
    configure();
  }

  function setSearchVisible(visible) {
    if (!searchBar || searchVisible === visible) return;
    searchVisible = visible;
    searchAnimation?.stop();
    searchBar.classList.toggle('is-visible', visible);
    const pill = searchBar.querySelector('.sites-header-inner');
    if (visible && animateSearch && !reducedMotion.matches) {
      searchAnimation = animateSearch(pill, {
        opacity: [0, 1],
        transform: ['translateY(-14px) scale(0.98)', 'translateY(0px) scale(1)']
      }, { duration: 0.32, ease: [0.22, 1, 0.36, 1] });
    } else {
      pill.style.opacity = '1';
      pill.style.transform = 'none';
    }
  }

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
    const heroVisible = hero && hero.getBoundingClientRect().bottom > 0;
    rail.hidden = !visible.length || heroVisible;
    const filtering = search.value.trim() !== '' || category.value !== 'all';
    setSearchVisible(!heroVisible || filtering);
  }

  function updateMatches() {
    const matching = cards.filter(card => !card.classList.contains('hidden')).length;
    if (ghostLayer) ghostLayer.hidden = matching === 0;
    if (footer) footer.hidden = matching === 0;
    if (empty) {
      empty.hidden = matching !== 0;
      const term = search.value.trim();
      const categoryLabel = category.value === 'all' ? '' : ` in ${category.selectedOptions[0].textContent}`;
      emptyMessage.textContent = term
        ? `No sites match “${term}”${categoryLabel}. Try another search or clear your filters.`
        : `No sites found${categoryLabel}. Try another category or clear your filters.`;
    }
    if (count) {
      const label = matching === cards.length ? `${cards.length} sites` : `${matching} of ${cards.length} sites`;
      if (count.textContent !== label) count.textContent = label;
    }
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
  search.addEventListener('input', updateMatches);
  category.addEventListener('change', updateMatches);
  window.addEventListener('resize', updatePosition);
  updateMatches();
})();
