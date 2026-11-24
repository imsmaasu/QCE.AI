const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:/Users/SMAASU/.gemini/antigravity/brain/c84f0983-5606-4783-ab8d-1eaa4fe47228/screenshots/version-history';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findChrome() {
  const paths = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  for (const p of paths) if (fs.existsSync(p)) return p;
  throw new Error('Chrome not found');
}

(async () => {
  const chromePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);

  // Add a Footing component via the UI
  const addBtn = await page.$('button[aria-expanded]');
  if (addBtn) {
    await addBtn.click();
    await sleep(300);
    // Click "Footing" in the dropdown menu
    const menuItems = await page.$$('.menu-item');
    for (const item of menuItems) {
      const text = await item.evaluate(el => el.textContent);
      if (text && text.trim() === 'Footing') {
        await item.click();
        break;
      }
    }
    await sleep(1500);
  }

  // Screenshot: full app with drawing panel showing
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_app_with_component.png') });
  console.log('5. App with footing component and drawing panel');

  // Check buttons exist and screenshot drawing panel header area
  const pngBtn = await page.$('button[aria-label="Save drawing as PNG"]');
  const pdfBtn = await page.$('button[aria-label="Export drawing as PDF"]');
  console.log('PNG button found:', !!pngBtn);
  console.log('PDF button found:', !!pdfBtn);

  if (pdfBtn) {
    const box = await pdfBtn.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06_drawing_panel_header_buttons.png'),
        clip: {
          x: Math.max(0, box.x - 200),
          y: Math.max(0, box.y - 20),
          width: 500,
          height: 60,
        },
      });
      console.log('6. Drawing panel header buttons captured');
    }
  }

  await browser.close();
  console.log('Done.');
})().catch(err => { console.error('FATAL', err.message); process.exit(1); });
