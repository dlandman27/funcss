# SNES controller

Open `/snes/` with the repository server (`npm run serve`). Original screenshot artwork, with the game display cropped away, is overlaid with responsive HTML buttons. Supports mouse, multitouch and keyboard. Inputs release when focus is lost or a pointer is cancelled.

```js
window.addEventListener('snesinput', ({ detail: { button, pressed } }) => {
  emulator.setButton(button, pressed); // Adapt to your emulator API.
});
```

Buttons: `up`, `down`, `left`, `right`, `a`, `b`, `x`, `y`, `l`, `r`, `start`, `select`, `menu`.

Keyboard: arrows for D-pad, X/Z for A/B, S/A for X/Y, Q/E for L/R, Shift for Select, Enter for Start, Escape for Menu.

`window.snesController.isPressed('a')` reads state; `releaseAll()` resets inputs. This controller provides input events; an emulator core is separate.
