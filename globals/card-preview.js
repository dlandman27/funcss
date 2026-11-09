'use strict';

(() => {
  const dialog = document.getElementById('sitePreview');
  if (!dialog) return;
  const title = document.getElementById('sitePreviewTitle');
  const description = document.getElementById('sitePreviewDescription');
  const visit = document.getElementById('sitePreviewVisit');

  const shareButton = document.getElementById('sitePreviewShare');
  const status = document.getElementById('siteShareStatus');
  async function shareSite(button, name, href) {
    const url = new URL(href);
    const publicUrl = `https://randomsitesontheweb.com${url.pathname}`;
    const original = button.textContent;
    button.disabled = true;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url: publicUrl });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = original; }, 2000);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        status.textContent = `Copy this link: ${publicUrl}`;
        if (!dialog.open) {
          title.textContent = name;
          description.textContent = '';
          visit.href = publicUrl;
          dialog.showModal();
        }
      }
    } finally { button.disabled = false; }
  }
  shareButton.addEventListener('click', () => shareSite(shareButton, title.textContent, visit.href));
  document.addEventListener('click', event => {
    const button = event.target.closest('.card-share');
    if (!button) return;
    event.preventDefault();
    const card = button.closest('.site-card');
    status.textContent = '';
    shareSite(button, card.querySelector('h2').textContent, card.querySelector('a').href);
  });

  // Delegation also covers cards cloned into the New and Hottest rails.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.card-preview-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    const card = trigger.closest('.site-card');
    status.textContent = '';
    title.textContent = card.querySelector('h2').textContent;
    description.textContent = card.querySelector('p').textContent;
    visit.href = card.querySelector('a').href;
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
