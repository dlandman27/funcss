(function() {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZHEXFVEQT1';
    document.head.appendChild(script);

    script.onload = function() {
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-ZHEXFVEQT1');
    };
})();


document.addEventListener('keydown', function(event) {
    if (event.key === 'Home') {
        window.location.href = 'https://randomsitesontheweb.com';
    }
});

// Current toy slug from the URL, or null on the homepage / non-toy pages.
// Handles both the clean /<slug>/ form and the legacy /sites/<slug>/ form.
function rsotwSlug() {
    var m = location.pathname.match(/^\/(?:sites\/)?([a-z0-9_-]+)\/?$/i);
    return m ? m[1].toLowerCase() : null;
}

// Send a GA event (prod only, fail silent). Uses gtag's arguments mechanism.
function rsotwTrack(name, params) {
    try {
        if (location.hostname !== 'randomsitesontheweb.com') return;
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        gtag('event', name, params || {});
    } catch (e) { /* never break a site over analytics */ }
}

// Play counter: report one open per site per tab session. Prod only, fail silent.
(function () {
    try {
        if (location.hostname !== 'randomsitesontheweb.com') return;
        var slug = rsotwSlug();
        if (!slug) return; // homepage and non-site pages don't count
        var key = 'hit_' + slug;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch (e) { /* storage blocked — count anyway */ }
        var url = '/api/hit?slug=' + encodeURIComponent(slug);
        if (!(navigator.sendBeacon && navigator.sendBeacon(url))) {
            fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
        }
    } catch (e) { /* never break a site over analytics */ }
})();


// ── Corner control: one button opens a menu (Shuffle · Share · Home) ──────
// Injected on every toy page (never the homepage). Fully isolated in a shadow
// root so a toy's CSS can't touch it, and wrapped so it can never break a toy.
var RSOTW_HOME_URL = 'https://randomsitesontheweb.com';

(function () {
    try {
        var slug = rsotwSlug();
        if (!slug) return; // homepage + non-toy pages get no control
        if (window.__rsotwControl) return; // guard against double-inject
        window.__rsotwControl = true;

        var start = function () {
            try { buildControl(slug); } catch (e) { /* never break a toy */ }
        };
        if (document.body) start();
        else document.addEventListener('DOMContentLoaded', start);
    } catch (e) { /* never break a toy */ }

    function buildControl(slug) {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var host = document.createElement('div');
        host.id = 'rsotw-control';
        host.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483000;';
        var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

        var css = ''
            + ':host{all:initial}'
            + '.menu{display:flex;flex-direction:column;align-items:flex-end;gap:10px;'
            + 'font-family:Nunito,"Segoe UI",system-ui,sans-serif}'
            + '.chip{width:44px;height:44px;border:3px solid #201a17;border-radius:50%;'
            + 'background:#fefaf0;color:#201a17;font-size:20px;line-height:1;cursor:pointer;'
            + 'display:flex;align-items:center;justify-content:center;padding:0;flex:0 0 auto;'
            + 'box-shadow:3px 3px 0 #201a17;text-decoration:none;'
            + (reduce ? '' : 'transition:transform .12s ease, box-shadow .12s ease;') + '}'
            + '.chip:hover,.item:hover .chip,.item:focus-visible .chip{' + (reduce ? '' : 'transform:translate(-1px,-1px);')
            + 'box-shadow:4px 4px 0 #201a17;outline:none}'
            + '.chip:active,.item:active .chip{transform:translate(2px,2px);box-shadow:1px 1px 0 #201a17}'
            + '.fab:focus-visible,.item:focus-visible .chip{outline:3px solid #5aa0db;outline-offset:2px}'
            + '.chip svg{width:22px;height:22px;display:block}'
            // Menu options: a row of [label pill][icon chip], hidden until open.
            + '.items{display:flex;flex-direction:column;align-items:flex-end;gap:10px}'
            + '.item{display:flex;align-items:center;gap:8px;background:none;border:0;padding:0;'
            + 'cursor:pointer;text-decoration:none;'
            + (reduce ? '' : 'transition:transform .16s ease, opacity .16s ease;') + '}'
            + '.lbl{background:#201a17;color:#f5ecd6;font-size:14px;font-weight:800;'
            + 'padding:6px 11px;border-radius:9px;white-space:nowrap;box-shadow:2px 2px 0 rgba(0,0,0,.25)}'
            // Closed state: options tucked away, faded and non-interactive.
            + '.item{opacity:0;pointer-events:none;transform:translateY(12px) scale(.9)}'
            + '.menu.open .item{opacity:1;pointer-events:auto;transform:none}'
            + '.fab svg{' + (reduce ? '' : 'transition:transform .18s ease;') + '}'
            + '.menu.open .fab svg{transform:rotate(45deg)}'
            + '.toast{position:absolute;right:0;bottom:56px;white-space:nowrap;'
            + 'background:#201a17;color:#f5ecd6;font-size:14px;font-weight:700;'
            + 'padding:8px 12px;border-radius:10px;opacity:0;pointer-events:none;'
            + (reduce ? '' : 'transition:opacity .18s ease;') + '}'
            + '.toast.show{opacity:1}'
            + '@media (max-width:520px){.chip{width:40px;height:40px}.chip svg{width:20px;height:20px}}';

        var SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
        var ICONS = {
            shuffle: '<svg ' + SVG + '><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
            share: '<svg ' + SVG + '><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>',
            home: '<svg ' + SVG + '><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            // Plus that rotates 45° into an X when the menu is open.
            plus: '<svg ' + SVG + '><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        };

        // Order top→bottom; Shuffle sits nearest the button (primary action).
        var chips = [
            { icon: ICONS.home, label: 'All sites', href: RSOTW_HOME_URL, ev: 'nav_home' },
            { icon: ICONS.share, label: 'Share this', act: share, ev: 'share' },
            { icon: ICONS.shuffle, label: 'Random site', act: shuffle, ev: 'shuffle' }
        ];

        var html = '<style>' + css + '</style>'
            + '<div class="menu" role="group" aria-label="Random Sites controls"><div class="items">';
        for (var i = 0; i < chips.length; i++) {
            var c = chips[i];
            var inner = '<span class="lbl">' + c.label + '</span><span class="chip" aria-hidden="true">' + c.icon + '</span>';
            if (c.href) {
                html += '<a class="item" href="' + c.href + '" aria-label="' + c.label + '" data-ev="' + c.ev + '" tabindex="-1">' + inner + '</a>';
            } else {
                html += '<button class="item" type="button" data-act="' + i + '" data-ev="' + c.ev + '" aria-label="' + c.label + '" tabindex="-1">' + inner + '</button>';
            }
        }
        html += '</div>'
            + '<button class="chip fab" type="button" aria-label="Menu" aria-haspopup="true" aria-expanded="false">' + ICONS.plus + '</button>'
            + '</div><div class="toast" role="status" aria-live="polite"></div>';
        root.innerHTML = html;
        document.body.appendChild(host);

        var toast = root.querySelector('.toast');
        function flash(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(function () { toast.classList.remove('show'); }, 1800);
        }

        var menu = root.querySelector('.menu');
        var fab = root.querySelector('.fab');
        var items = root.querySelectorAll('.item');
        function isOpen() { return menu.classList.contains('open'); }
        function setOpen(open) {
            menu.classList.toggle('open', open);
            fab.setAttribute('aria-expanded', open ? 'true' : 'false');
            for (var k = 0; k < items.length; k++) items[k].tabIndex = open ? 0 : -1;
            if (open) rsotwTrack('menu_open', { item_id: slug });
        }

        fab.addEventListener('click', function () { setOpen(!isOpen()); });

        // Run an option's action (buttons) then close; links just navigate.
        for (var b = 0; b < items.length; b++) {
            items[b].addEventListener('click', function () {
                var act = this.getAttribute('data-act');
                if (act !== null) {
                    try { chips[Number(act)].act(); } catch (e) {}
                    setOpen(false);
                }
            });
        }

        // Track every option click (buttons + links) in GA.
        menu.addEventListener('click', function (e) {
            var item = e.target && e.target.closest ? e.target.closest('.item') : null;
            if (item && item.getAttribute('data-ev')) {
                rsotwTrack(item.getAttribute('data-ev'), { item_id: slug });
            }
        });

        // Close on outside click (shadow retargets inside clicks to the host)
        // and on Escape.
        document.addEventListener('click', function (e) {
            if (isOpen() && e.target !== host) setOpen(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) { setOpen(false); fab.focus(); }
        });

        function share() {
            var url = location.href;
            var title = document.title || 'Random Sites on the Web';
            if (navigator.share) {
                navigator.share({ title: title, url: url }).catch(function () {});
                return;
            }
            var done = function () { flash('Link copied ✓'); };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(done).catch(fallbackCopy);
            } else {
                fallbackCopy();
            }
            function fallbackCopy() {
                try {
                    var ta = document.createElement('textarea');
                    ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
                    document.body.appendChild(ta); ta.focus(); ta.select();
                    document.execCommand('copy'); document.body.removeChild(ta);
                    done();
                } catch (e) { flash('Copy failed'); }
            }
        }

        var catalogPromise = null;
        function shuffle() {
            flash('Rolling…');
            if (!catalogPromise) {
                catalogPromise = fetch('/catalog.json').then(function (r) { return r.json(); });
            }
            catalogPromise.then(function (cat) {
                var pool = (cat.sites || []).filter(function (s) {
                    return s.visible && s.random && s.slug.toLowerCase() !== slug;
                });
                if (!pool.length) { flash('No sites found'); return; }
                var pick = pool[Math.floor(Math.random() * pool.length)];
                location.href = '/' + pick.slug + '/';
            }).catch(function () {
                catalogPromise = null;
                flash('Try again');
            });
        }
    }
})();

