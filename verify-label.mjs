import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('p'));
  return els.map(e => ({ text: e.textContent, opacity: getComputedStyle(e).opacity, parentOpacity: getComputedStyle(e.parentElement).opacity, color: getComputedStyle(e).color }));
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
