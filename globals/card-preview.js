'use strict';

// Site info modal: the ⓘ button on a card opens its art, full description,
// play count and share options. Clicking the card itself just opens the site.
(() => {
  const dialog = document.getElementById('sitePreview');
  if (!dialog) return;
  const art = document.getElementById('sitePreviewArt');
  const meta = document.getElementById('sitePreviewMeta');
  const title = document.getElementById('sitePreviewTitle');
  const description = document.getElementById('sitePreviewDescription');
  const visit = document.getElementById('sitePreviewVisit');
  const status = document.getElementById('siteShareStatus');
  const share = Object.fromEntries(
    [...dialog.querySelectorAll('[data-share]')].map(el => [el.dataset.share, el])
  );
  const copyLabel = share.copy.querySelector('span');
  let current = { name: '', url: '' };

  share.native.hidden = !navigator.share;

  function chip(text, kind) {
    const el = document.createElement('span');
    el.className = 'site-preview-chip' + (kind ? ' is-' + kind : '');
    el.textContent = text;
    meta.appendChild(el);
  }

  function open(card) {
    const link = card.querySelector('a');
    const name = card.querySelector('h2').textContent.trim();
    const url = `https://randomsitesontheweb.com${new URL(link.href).pathname}`;
    current = { name, url };

    title.textContent = name;
    description.textContent = card.querySelector('p').textContent.trim();
    visit.href = link.href;

    const img = card.querySelector('img.site-image');
    art.hidden = !img;
    art.classList.toggle('is-wide', !!card.dataset.banner);
    if (card.dataset.banner) art.src = `/public/site-banners/${card.dataset.banner}.webp`;
    else if (img) art.src = img.currentSrc || img.src;

    meta.textContent = '';
    const category = card.querySelector('.category');
    if (category) chip(category.textContent.trim());
    if (card.querySelector('.new-badge')) chip('★ New', 'new');
    const plays = card.querySelector('.plays');
    if (plays) chip(plays.textContent.trim(), 'plays');

    const text = `${name} on Random Sites On The Web`;
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(text);
    share.x.href = `https://x.com/intent/post?text=${t}&url=${u}`;
    share.facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    share.reddit.href = `https://www.reddit.com/submit?url=${u}&title=${t}`;
    share.whatsapp.href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    share.email.href = `mailto:?subject=${t}&body=${encodeURIComponent(card.querySelector('p').textContent.trim() + '\n\n' + url)}`;

    status.textContent = '';
    copyLabel.textContent = 'Copy link';
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  share.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(current.url);
      copyLabel.textContent = 'Copied!';
      setTimeout(() => { copyLabel.textContent = 'Copy link'; }, 2000);
    } catch (error) {
      status.textContent = `Copy this link: ${current.url}`;
    }
  });

  share.native.addEventListener('click', async () => {
    try {
      await navigator.share({ title: current.name, url: current.url });
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = `Copy this link: ${current.url}`;
    }
  });

  // Delegation also covers cards cloned into the homepage rails.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.card-preview-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    open(trigger.closest('.site-card'));
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Hovering a banner card swaps the still image for the live banner, so its
  // animation plays. Only the hovered card is ever live.
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let live = null;
  let liveCard = null;
  let liveTimer = 0;

  function stopLive() {
    clearTimeout(liveTimer);
    if (live) live.remove();
    live = liveCard = null;
  }

  function startLive(card) {
    const link = card.querySelector('a');
    const frame = document.createElement('iframe');
    frame.className = 'banner-live';
    frame.src = `/banners/${card.dataset.banner}.html?live`;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.transform = `scale(${link.clientWidth / 800})`;
    frame.addEventListener('load', () => frame.classList.add('is-ready'));
    link.appendChild(frame);
    live = frame;
  }

  document.addEventListener('mouseover', (event) => {
    if (!canHover.matches || reducedMotion.matches) return;
    const card = event.target.closest('.site-card.has-banner');
    if (card === liveCard) return;
    stopLive();
    if (!card) return;
    liveCard = card;
    liveTimer = setTimeout(() => startLive(card), 90);
  });
  document.addEventListener('mouseleave', stopLive);
})();
