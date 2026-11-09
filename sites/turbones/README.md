# Turbo NES controller

Open `/turbones/` using the repository server (`npm run serve`). This is a controller surface, without a game screen or emulator core. Original skin artwork was extracted from the supplied `turbones.deltaskin`; the live controls are HTML buttons. Keep `assets/controller.png` alongside the CSS and JavaScript when copying this component.

Connect an emulator using the event interface:

```js
window.addEventListener('nesinput', ({ detail: { button, pressed } }) => {
  // button: up, down, left, right, a, b, start, select, menu
  emulator.setButton(button, pressed); // Replace with your emulator's API.
});
```

`window.nesController.isPressed('a')` returns the current input state. `window.nesController.releaseAll()` releases every input. Turbo pulses A and B together every 65 ms while held. Multiple touches and keyboard inputs can be held together. Losing focus releases all inputs.

Keyboard: arrows for direction, X for A, Z for B, Enter for Start, Shift for Select, Space for Turbo, Escape for the menu. Touches can slide across the directional pad. The layout scales proportionally to the available width and height; all hit areas stay aligned with the original artwork.
