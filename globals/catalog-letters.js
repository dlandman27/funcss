'use strict';

(() => {
  const cards = [...document.querySelectorAll('.site-grid .site-card')];
  if (!cards.length) return;
  const count = document.getElementById('catalogCount');
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
  let animateSearch;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // The lightweight DOM build uses native browser animations without React.
  import('https://cdn.jsdelivr.net/npm/motion@12.23.24/mini/+esm')
    .then(module => {
      animateSearch = module.animate;
      const heroCard = document.querySelector('.hero-center');
      if (heroCard && !reducedMotion.matches && heroCard.getBoundingClientRect().bottom > 0) {
        animateSearch(heroCard, {
          opacity: [0, 1],
          transform: ['translateY(22px) scale(0.97)', 'translateY(0px) scale(1)']
        }, { duration: 0.55, ease: [0.22, 1, 0.36, 1] });
      }
    })
    .catch(() => {}); // Keep the search usable if the animation library cannot load.

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
  }

  const observer = new MutationObserver(updateMatches);
  for (const card of document.querySelectorAll('.site-card')) {
    observer.observe(card, { attributes: true, attributeFilter: ['class'] });
  }
  search.addEventListener('input', updateMatches);
  category.addEventListener('change', updateMatches);
  updateMatches();
})();
