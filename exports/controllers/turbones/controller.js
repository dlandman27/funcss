const buttons = [...document.querySelectorAll('[data-input]')];
const dialog = document.querySelector('dialog');
const status = document.querySelector('#input-status');
const sources = new Map();
const active = new Set();
const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyZ: 'b', KeyX: 'a', ShiftLeft: 'select', ShiftRight: 'select', Enter: 'start', Space: 'turbo', Escape: 'menu' };
let turboTimer;
let turboPhase = false;

function emit(button, pressed) {
  if (pressed === active.has(button)) return;
  if (pressed) active.add(button); else active.delete(button);
  window.dispatchEvent(new CustomEvent('nesinput', { detail: { button, pressed } }));
}
function sync() {
  const held = new Set([...sources.values()].flat());
  const turbo = held.has('turbo');
  for (const button of buttons) button.classList.toggle('pressed', held.has(button.dataset.input));
  for (const name of ['up', 'down', 'left', 'right', 'a', 'b', 'select', 'start', 'menu']) {
    emit(name, held.has(name) || (turbo && turboPhase && (name === 'a' || name === 'b')));
  }
  if (turbo && !turboTimer) {
    turboPhase = true;
    turboTimer = setInterval(() => { turboPhase = !turboPhase; sync(); }, 65);
    sync();
  } else if (!turbo && turboTimer) {
    clearInterval(turboTimer); turboTimer = undefined; turboPhase = false;
  }
  status.textContent = held.size ? `Pressed: ${[...held].join(' + ')}` : 'Ready';
}
function setSource(id, input) {
  const previous = sources.get(id);
  if (input) sources.set(id, [input]); else sources.delete(id);
  sync();
  if (input === 'menu' && !previous && !dialog.open) {
    releaseAll(); dialog.showModal();
  }
}
function releaseAll() { sources.clear(); sync(); }
for (const button of buttons) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    setSource(`pointer:${event.pointerId}`, button.dataset.input);
  });
  button.addEventListener('pointermove', event => {
    const id = `pointer:${event.pointerId}`;
    if (!sources.has(id)) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-input]');
    // Keep the pointer tracked when sliding through the gap between directions.
    sources.set(id, target ? [target.dataset.input] : []); sync();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, event => setSource(`pointer:${event.pointerId}`, null));
  }
  // Native keyboard activation and assistive technology produce clicks without a pointer.
  button.addEventListener('click', event => {
    if (event.detail !== 0) return;
    setSource('accessible', button.dataset.input);
    setTimeout(() => setSource('accessible', null), 120);
  });
}
window.addEventListener('keydown', event => {
  if (!keys[event.code] || dialog.open || (event.target.matches('button') && ['Space', 'Enter'].includes(event.code))) return;
  event.preventDefault();
  if (!event.repeat) setSource(`key:${event.code}`, keys[event.code]);
});
window.addEventListener('keyup', event => {
  if (!keys[event.code]) return;
  setSource(`key:${event.code}`, null);
});
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
dialog.addEventListener('close', releaseAll);
window.nesController = { isPressed: button => active.has(button), releaseAll };
