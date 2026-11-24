const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:/Users/SMAASU/.gemini/antigravity/brain/c84f0983-5606-4783-ab8d-1eaa4fe47228/screenshots/version-history';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Load app
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);

  // 1. Full app - TopBar visible with v0.4 badge
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_topbar_version_badge.png') });
  console.log('1. TopBar badge captured');

  // 2. Click v0.4 badge button to open Version History
  const versionBtn = await page.$('button.top-bar__version-btn');
  if (!versionBtn) { console.error('Version badge not found'); await browser.close(); process.exit(1); }
  await versionBtn.click();
  await sleep(700); // 320ms animation + settle
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_version_history_top.png') });
  console.log('2. Version History top captured');

  // 3. Scroll to bottom of vh-content to show Special Thanks
  await page.evaluate(() => {
    const content = document.querySelector('.vh-content');
    if (content) content.scrollTop = content.scrollHeight;
  });
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_version_history_special_thanks.png') });
  console.log('3. Special Thanks card captured');

  // 4. Close and check DrawingPanel export buttons
  await page.keyboard.press('Escape');
  await sleep(400);

  // Load sample project data via URL to have a component visible
  await page.evaluate(() => {
    // Trigger the loadSampleProject if available
    try {
      const stores = Object.values(window).filter(v => v && typeof v === 'object' && typeof v.getState === 'function');
      for (const s of stores) {
        const state = s.getState();
        if (state && state.loadSampleProject) { state.loadSampleProject(); break; }
      }
    } catch (e) {}
  });
  await sleep(1500);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_app_with_drawing_panel.png') });
  console.log('4. App with DrawingPanel captured');

  // 5. Try clicking the Export PDF button to verify it's present
  const exportPdfBtn = await page.$('button[aria-label="Export drawing as PDF"]');
  const savePngBtn = await page.$('button[aria-label="Save drawing as PNG"]');
  console.log('Export PDF button found:', !!exportPdfBtn);
  console.log('Save PNG button found:', !!savePngBtn);

  await browser.close();
  console.log('Done. Screenshots saved to', SCREENSHOT_DIR);
})().catch(err => { console.error('FATAL', err.message); process.exit(1); });
