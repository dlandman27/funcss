const controller = document.querySelector('.controller');
const dialog = document.querySelector('dialog');
const buttons = [...document.querySelectorAll('[data-input]')];
const sources = new Map();
const active = new Set();
const keyMap = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'a',KeyZ:'b',KeyS:'x',KeyA:'y',KeyQ:'l',KeyE:'r',ShiftLeft:'select',ShiftRight:'select',Enter:'start',Escape:'menu'};
function updateButtons() {
  const held = new Set(sources.values());
  for (const button of buttons) {
    const name = button.dataset.input;
    const pressed = held.has(name);
    button.classList.toggle('pressed', pressed);
    if (pressed === active.has(name)) continue;
    if (pressed) active.add(name); else active.delete(name);
    window.dispatchEvent(new CustomEvent('snesinput',{detail:{button:name,pressed}}));
  }
}
function releaseAll() { sources.clear(); updateButtons(); }
function openMenu() { releaseAll(); if (!dialog.open) dialog.showModal(); }
for (const button of buttons) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    sources.set(`p:${event.pointerId}`,button.dataset.input); updateButtons();
    if (button.dataset.input === 'menu') openMenu();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,event=>{
    sources.delete(`p:${event.pointerId}`); updateButtons();
  });
  button.addEventListener('click',event=>{
    if (event.detail !== 0) return;
    if (button.dataset.input === 'menu') return openMenu();
    sources.set('accessible',button.dataset.input); updateButtons();
    setTimeout(()=>{sources.delete('accessible');updateButtons()},120);
  });
}
window.addEventListener('keydown',event=>{
  if(dialog.open || event.repeat)return;
  if(event.target.matches('button') && ['Space','Enter'].includes(event.code))return;
  const name=keyMap[event.code];if(!name)return;
  event.preventDefault();sources.set(`k:${event.code}`,name);updateButtons();
  if(name==='menu')openMenu();
});
window.addEventListener('keyup',event=>{
  sources.delete(`k:${event.code}`);updateButtons();
});
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
dialog.addEventListener('close',releaseAll);
window.snesController={isPressed:name=>active.has(name),releaseAll};
