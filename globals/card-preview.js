'use strict';

(() => {
  const dialog = document.getElementById('sitePreview');
  if (!dialog) return;
  const title = document.getElementById('sitePreviewTitle');
  const description = document.getElementById('sitePreviewDescription');
  const visit = document.getElementById('sitePreviewVisit');

  // Delegation also covers cards cloned into the New and Hottest rails.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.card-preview-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    const card = trigger.closest('.site-card');
    title.textContent = card.querySelector('h2').textContent;
    description.textContent = card.querySelector('p').textContent;
    visit.href = card.querySelector('a').href;
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
