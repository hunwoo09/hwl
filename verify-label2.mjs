import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', msg => console.log('CONSOLE:', msg.text()));
await page.setViewportSize({ width: 1600, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  // find the label container (parent of the title <p>)
  const titleP = document.querySelector('p[style*="italic"]');
  const container = titleP ? titleP.closest('div[style*="flex-direction"]') ?? titleP.parentElement.parentElement : null;
  return {
    titleText: titleP?.textContent,
    containerOpacity: container ? getComputedStyle(container).opacity : null,
    containerStyleOpacity: container?.style.opacity,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
