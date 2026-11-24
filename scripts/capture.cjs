const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\SMAASU\\.gemini\\antigravity\\brain\\c84f0983-5606-4783-ab8d-1eaa4fe47228\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
  { name: '390', width: 390, height: 844 },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const theme of ['light', 'dark']) {
      console.log(`  Capturing theme: ${theme}`);
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

      // Clear storage and reload to test fresh
      await page.evaluate((th) => {
        localStorage.clear();
        document.documentElement.setAttribute('data-theme', th);
      }, theme);
      await page.reload({ waitUntil: 'networkidle0' });

      // Set theme attribute
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
      }, theme);

      // 1. Home (empty home)
      await page.screenshot({
        path: path.join(OUT_DIR, `home_empty_${theme}_${vp.name}.png`),
      });

      // Load sample project
      await page.evaluate(() => {
        const sampleBtn = document.querySelector('.quiet-link');
        if (sampleBtn) sampleBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));

      // 2. Collapsed list
      await page.screenshot({
        path: path.join(OUT_DIR, `collapsed_list_${theme}_${vp.name}.png`),
      });

      // 3. One expanded card (expand first card)
      await page.evaluate(() => {
        const cardHeader = document.querySelector('.card__header');
        if (cardHeader) cardHeader.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(OUT_DIR, `expanded_card_${theme}_${vp.name}.png`),
      });

      // 4. Sidebar open
      await page.evaluate(() => {
        const hamburger = document.querySelector('.top-bar__left button');
        if (hamburger) hamburger.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(OUT_DIR, `sidebar_open_${theme}_${vp.name}.png`),
      });

      // 5. Sheet view
      await page.evaluate(() => {
        const sheetBtn = document.querySelector('.top-bar__right .btn');
        if (sheetBtn) sheetBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(OUT_DIR, `sheet_${theme}_${vp.name}.png`),
      });
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully in ' + OUT_DIR);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
