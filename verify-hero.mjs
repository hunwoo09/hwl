import { chromium } from 'playwright';
const shots = '/private/tmp/claude-501/-Volumes-hwl--website-my-portfolio/f0b0e8fd-c9f1-47f8-a979-cd1dee1d5c67/scratchpad';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.setViewportSize({ width: 1600, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// Let the full first-visit intro play out
await page.waitForTimeout(6000);
await page.screenshot({ path: `${shots}/hero-first-visit-settled.png` });

// Navigate away then back via real in-app clicks (page.goto would hard-reload
// and reset the module-level _introPlayed flag, defeating the point of this test)
await page.click('nav a[href="/works"]');
await page.waitForTimeout(1500);
await page.click('a[href="/"]');
// capture frames right as it re-mounts
const times = [0, 30, 60, 100, 150, 250, 400, 700];
let last = 0;
for (const t of times) {
  await page.waitForTimeout(Math.max(0, t - last));
  last = t;
  await page.screenshot({ path: `${shots}/hero-return-t${String(t).padStart(4,'0')}.png` });
}

console.log('errors:', errors);
await browser.close();
