import { stickPosition } from './stick.mjs';
const controller = document.querySelector('.controller');
const stick = document.querySelector('.stick');
const hit = document.querySelector('.stick-hit');
const dialog = document.querySelector('dialog');
const buttons = [...document.querySelectorAll('[data-input]')];
const sources = new Map();
const active = new Set();
const heldKeys = new Set();
const keyMap = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'a',KeyZ:'b',KeyQ:'l',KeyE:'r',ShiftLeft:'z',ShiftRight:'z',KeyI:'cup',KeyJ:'cleft',KeyK:'cdown',KeyL:'cright',Enter:'start',Escape:'menu'};
let pointer;
let analog = {x:0,y:0};
function updateButtons() {
  const held = new Set(sources.values());
  for (const button of buttons) {
    const name = button.dataset.input;
    const pressed = held.has(name);
    button.classList.toggle('pressed', pressed);
    if (pressed === active.has(name)) continue;
    if (pressed) active.add(name); else active.delete(name);
    window.dispatchEvent(new CustomEvent('n64input',{detail:{button:name,pressed}}));
  }
}
function updateStick(x,y) {
  analog = {x,y};
  const radius = hit.getBoundingClientRect().width * .22;
  stick.style.setProperty('--stick-x',`${x * radius}px`);
  stick.style.setProperty('--stick-y',`${y * radius}px`);
  window.dispatchEvent(new CustomEvent('n64stick',{detail:{x,y}}));
}
function keyboardStick() {
  const x = Number(heldKeys.has('KeyD')) - Number(heldKeys.has('KeyA'));
  const y = Number(heldKeys.has('KeyS')) - Number(heldKeys.has('KeyW'));
  const length = Math.max(1,Math.hypot(x,y));
  updateStick(x/length,y/length);
}
function releaseAll() {
  sources.clear(); heldKeys.clear(); pointer = undefined;
  controller.classList.remove('dragging'); updateButtons(); updateStick(0,0);
}
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
function moveStick(event) {
  const rect = hit.getBoundingClientRect();
  const position = stickPosition(event.clientX,event.clientY,rect);
  updateStick(position.x,position.y);
}
hit.addEventListener('pointerdown',event=>{
  if (event.button !== 0 || pointer !== undefined) return;
  event.preventDefault(); pointer = event.pointerId;
  hit.setPointerCapture(pointer); controller.classList.add('dragging'); moveStick(event);
});
hit.addEventListener('pointermove',event=>{if(event.pointerId===pointer)moveStick(event)});
for (const type of ['pointerup','pointercancel','lostpointercapture']) hit.addEventListener(type,event=>{
  if(event.pointerId!==pointer)return;
  pointer=undefined;controller.classList.remove('dragging');keyboardStick();
});
window.addEventListener('keydown',event=>{
  if(dialog.open || event.repeat)return;
  if(event.target.matches('button') && ['Space','Enter'].includes(event.code))return;
  if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code)){
    event.preventDefault();heldKeys.add(event.code);if(pointer===undefined)keyboardStick();return;
  }
  const name=keyMap[event.code];if(!name)return;
  event.preventDefault();sources.set(`k:${event.code}`,name);updateButtons();
  if(name==='menu')openMenu();
});
window.addEventListener('keyup',event=>{
  sources.delete(`k:${event.code}`);heldKeys.delete(event.code);updateButtons();
  if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code)&&pointer===undefined)keyboardStick();
});
window.addEventListener('blur',releaseAll);
window.addEventListener('resize',()=>updateStick(analog.x,analog.y));
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
dialog.addEventListener('close',releaseAll);
window.n64Controller={isPressed:name=>active.has(name),getStick:()=>({...analog}),releaseAll};
