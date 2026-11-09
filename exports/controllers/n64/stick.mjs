// Screen coordinates: right and down are positive. Output stays in the unit circle.
export function stickPosition(clientX, clientY, rect) {
  const radius = rect.width * .22;
  if (radius <= 0) return { x: 0, y: 0 };
  const x = (clientX - rect.left - rect.width / 2) / radius;
  const y = (clientY - rect.top - rect.height / 2) / radius;
  const magnitude = Math.hypot(x, y);
  if (magnitude < .08) return { x: 0, y: 0 };
  const scale = Math.max(1, magnitude);
  return { x: x / scale, y: y / scale };
}
