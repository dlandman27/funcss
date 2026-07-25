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


// ── Corner control: Share · Shuffle · Home · Tip ──────────────────────────
// Injected on every toy page (never the homepage). Fully isolated in a shadow
// root so a toy's CSS can't touch it, and wrapped so it can never break a toy.
var RSOTW_KOFI_URL = 'https://ko-fi.com/dylanlandmandev';
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
            + '.bar{display:flex;gap:8px;font-family:Nunito,"Segoe UI",system-ui,sans-serif}'
            + '.chip{width:44px;height:44px;border:3px solid #201a17;border-radius:50%;'
            + 'background:#fefaf0;color:#201a17;font-size:20px;line-height:1;cursor:pointer;'
            + 'display:flex;align-items:center;justify-content:center;padding:0;'
            + 'box-shadow:3px 3px 0 #201a17;text-decoration:none;'
            + (reduce ? '' : 'transition:transform .12s ease, box-shadow .12s ease;') + '}'
            + '.chip:hover,.chip:focus-visible{' + (reduce ? '' : 'transform:translate(-1px,-1px);')
            + 'box-shadow:4px 4px 0 #201a17;outline:none}'
            + '.chip:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #201a17}'
            + '.chip:focus-visible{outline:3px solid #5aa0db;outline-offset:2px}'
            + '.chip svg{width:22px;height:22px;display:block}'
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
            coffee: '<svg ' + SVG + '><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
            home: '<svg ' + SVG + '><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        };

        var chips = [
            { icon: ICONS.shuffle, label: 'Random site', act: shuffle },
            { icon: ICONS.share, label: 'Share this', act: share },
            { icon: ICONS.coffee, label: 'Buy me a coffee', href: RSOTW_KOFI_URL },
            { icon: ICONS.home, label: 'All sites', href: RSOTW_HOME_URL }
        ];

        var html = '<style>' + css + '</style><div class="bar" role="group" aria-label="Random Sites controls">';
        for (var i = 0; i < chips.length; i++) {
            var c = chips[i];
            if (c.href) {
                html += '<a class="chip" href="' + c.href + '" title="' + c.label + '" aria-label="' + c.label + '"'
                    + (c.href === RSOTW_KOFI_URL ? ' target="_blank" rel="noopener"' : '') + '>' + c.icon + '</a>';
            } else {
                html += '<button class="chip" type="button" data-act="' + i + '" title="' + c.label
                    + '" aria-label="' + c.label + '">' + c.icon + '</button>';
            }
        }
        html += '</div><div class="toast" role="status" aria-live="polite"></div>';
        root.innerHTML = html;
        document.body.appendChild(host);

        var toast = root.querySelector('.toast');
        function flash(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(function () { toast.classList.remove('show'); }, 1800);
        }

        var buttons = root.querySelectorAll('button.chip');
        for (var b = 0; b < buttons.length; b++) {
            buttons[b].addEventListener('click', function () {
                try { chips[Number(this.getAttribute('data-act'))].act(); } catch (e) {}
            });
        }

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

