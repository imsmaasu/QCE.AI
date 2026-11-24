const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\SMAASU\\.gemini\\antigravity\\brain\\c84f0983-5606-4783-ab8d-1eaa4fe47228\\screenshots\\milestone22';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  console.log('1. Capturing Desktop 1920px (Right sticky panel)...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Load sample project
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const sampleBtn = document.querySelector('.quiet-link');
    if (sampleBtn) (sampleBtn).click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Expand first card
  await page.evaluate(() => {
    const f1Card = document.querySelectorAll('.card')[0];
    if (f1Card && !f1Card.classList.contains('card--expanded')) {
      const header = f1Card.querySelector('.card__header');
      if (header) (header).click();
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 1: Desktop 1920px light with right drawing panel
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_panel_1920_light.png') });
  console.log('Saved m22_panel_1920_light.png');

  // Screenshot 2: Desktop 1280px light
  await page.setViewport({ width: 1280, height: 900 });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_panel_1280_light.png') });
  console.log('Saved m22_panel_1280_light.png');

  // Screenshot 3: Mobile 390px stacked fallback
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_stacked_390_light.png') });
  console.log('Saved m22_stacked_390_light.png');

  // Switch back to 1920px
  await page.setViewport({ width: 1920, height: 1080 });

  // Screenshot 4: Dark theme
  await page.evaluate(() => {
    const themeBtn = document.querySelector('.theme-switch-btn');
    if (themeBtn) (themeBtn).click(); // cycle to dark
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_panel_1920_dark.png') });
  console.log('Saved m22_panel_1920_dark.png');

  // Switch back to light theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });

  // Switch to Site View tab on Footing
  console.log('2. Capturing Site Views...');
  await page.evaluate(() => {
    const panel = document.querySelector('.drawing-panel-container');
    if (panel) {
      const tabBtns = panel.querySelectorAll('button');
      for (const btn of tabBtns) {
        if (btn.textContent && btn.textContent.includes('Site View')) {
          (btn).click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_footing_site_textbook.png') });
  console.log('Saved m22_footing_site_textbook.png');

  // Switch to Color style
  await page.evaluate(() => {
    const panel = document.querySelector('.drawing-panel-container');
    if (panel) {
      const btns = panel.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent === 'Color') {
          (b).click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_footing_site_color.png') });
  console.log('Saved m22_footing_site_color.png');

  // Click Beam card to switch active component
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.card');
    for (const c of cards) {
      if (c.textContent && c.textContent.includes('Beam')) {
        const header = c.querySelector('.card__header');
        if (header) (header).click();
        break;
      }
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Site view on Beam
  await page.evaluate(() => {
    const panel = document.querySelector('.drawing-panel-container');
    if (panel) {
      const tabBtns = panel.querySelectorAll('button');
      for (const btn of tabBtns) {
        if (btn.textContent && btn.textContent.includes('Site View')) {
          (btn).click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_beam_site_textbook.png') });
  console.log('Saved m22_beam_site_textbook.png');

  // Beam clean elevation view
  await page.evaluate(() => {
    const panel = document.querySelector('.drawing-panel-container');
    if (panel) {
      const tabBtns = panel.querySelectorAll('button');
      for (const btn of tabBtns) {
        if (btn.textContent === 'Elevation') {
          (btn).click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_beam_clean_elevation.png') });
  console.log('Saved m22_beam_clean_elevation.png');

  // Click Column card
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.card');
    for (const c of cards) {
      if (c.textContent && c.textContent.includes('Column')) {
        const header = c.querySelector('.card__header');
        if (header) (header).click();
        break;
      }
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Site view on Column
  await page.evaluate(() => {
    const panel = document.querySelector('.drawing-panel-container');
    if (panel) {
      const tabBtns = panel.querySelectorAll('button');
      for (const btn of tabBtns) {
        if (btn.textContent && btn.textContent.includes('Site View')) {
          (btn).click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'm22_column_site_textbook.png') });
  console.log('Saved m22_column_site_textbook.png');

  await browser.close();
  console.log('All screenshots captured successfully in milestone22 directory!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
