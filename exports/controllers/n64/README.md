# N64 controller

Run the repository server with `npm run serve`, then open `/n64/`.

The artwork uses the supplied screenshot with the empty screen cropped away. The analog base is CSS and its knob is a separate image, so dragging actually moves the knob. The layout scales proportionally to fit the viewport. Mouse, touch, simultaneous button holds, keyboard, pointer cancellation and focus-loss cleanup are supported.

Connect your emulator:

```js
window.addEventListener('n64input', ({ detail: { button, pressed } }) => {
  // a, b, z, l, r, start, up, down, left, right, cup, cleft, cright, cdown, menu
  emulator.setButton(button, pressed); // Adapt to your emulator's API.
});
window.addEventListener('n64stick', ({ detail: { x, y } }) => {
  // Each axis is -1 to 1; positive X points right, positive Y points down.
  emulator.setStick(x, y); // Invert Y here if your emulator expects up-positive.
});
```

Read current state with `window.n64Controller.getStick()` and `isPressed('a')`. Use `releaseAll()` to reset. The stick is clamped to a unit circle and returns to center when released. W A S D also moves the stick; the menu lists all keyboard mappings.

This is an input surface ready to integrate with an emulator, without an emulator core or game display.
