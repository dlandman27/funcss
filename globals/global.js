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

// Play counter: report one open per site per tab session. Prod only, fail silent.
(function () {
    try {
        if (location.hostname !== 'randomsitesontheweb.com') return;
        var m = location.pathname.match(/^\/sites\/([a-z0-9_-]+)\/?/i);
        if (!m) return; // homepage and non-site pages don't count
        var slug = m[1].toLowerCase();
        var key = 'hit_' + slug;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch (e) { /* storage blocked — count anyway */ }
        var url = '/api/hit?slug=' + encodeURIComponent(slug);
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url);
        } else {
            fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
        }
    } catch (e) { /* never break a site over analytics */ }
})();

