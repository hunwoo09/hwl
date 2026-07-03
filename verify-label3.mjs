import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', msg => { if (msg.text().includes('DEBUG') || msg.type() === 'error') console.log('CONSOLE:', msg.type(), msg.text()); });
page.on('pageerror', e => console.log('PAGEERROR:', String(e)));
await page.setViewportSize({ width: 1600, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  const video = document.querySelector('video');
  return {
    overlayStillInDom: !!video,
    videoEnded: video?.ended,
    videoReadyState: video?.readyState,
    videoError: video?.error?.message,
    videoCurrentTime: video?.currentTime,
    videoDuration: video?.duration,
    videoPaused: video?.paused,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
