// ?live = hovered on the homepage: let animations and script loops run.
if (/[?&]live\b/.test(location.search)) document.documentElement.classList.add('live');
window.LIVE = document.documentElement.classList.contains('live');
