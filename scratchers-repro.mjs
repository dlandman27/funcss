import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900 });

const logs = [];
page.on('console', m => logs.push(`[console.${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:3400/scratchers/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#ticketWrap');
await new Promise(r => setTimeout(r, 1000));

const box = await (await page.$('#ticketWrap')).boundingBox();
// PLAY area in logical 440x310 space: x 16..424, y 84..258
const lx = x => box.x + (x / 440) * box.width;
const ly = y => box.y + (y / 310) * box.height;

// sweep the whole play area in rows until all spots reveal
for (let pass = 0; pass < 2; pass++) {
  for (let y = 90; y <= 254; y += 10) {
    await page.mouse.move(lx(20), ly(y));
    await page.mouse.down();
    for (let x = 20; x <= 420; x += 12) {
      await page.mouse.move(lx(x), ly(y), { steps: 1 });
    }
    await page.mouse.up();
  }
}

// wait for resolve (450ms) + stamp + nextTicket (1400/2100ms) + slide-in
await new Promise(r => setTimeout(r, 4500));

const after = await page.evaluate(() => {
  const stamp = document.getElementById('stamp');
  return {
    stampShown: stamp.style.display,
    stampText: stamp.textContent,
    stats: document.getElementById('stats').textContent,
    wrapStyle: document.getElementById('ticketWrap').getAttribute('style'),
  };
});
console.log('AFTER:', JSON.stringify(after, null, 2));
console.log('--- captured logs ---');
logs.forEach(l => console.log(l));
await page.screenshot({ path: '/tmp/scratchers-after.png' });
await browser.close();
