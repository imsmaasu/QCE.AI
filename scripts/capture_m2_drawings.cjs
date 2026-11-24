const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\SMAASU\\.gemini\\antigravity\\brain\\c84f0983-5606-4783-ab8d-1eaa4fe47228\\screenshots\\milestone2';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 900 },
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

      // Reset and initialize sample project
      await page.evaluate((th) => {
        localStorage.clear();
        document.documentElement.setAttribute('data-theme', th);
      }, theme);
      await page.reload({ waitUntil: 'networkidle0' });

      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        const sampleBtn = document.querySelector('.quiet-link');
        if (sampleBtn) sampleBtn.click();
      }, theme);
      await new Promise((r) => setTimeout(r, 500));

      // Expand all components so cards are visible
      await page.evaluate(() => {
        // Expand F1, C1, B1
        const cards = document.querySelectorAll('.card');
        cards.forEach((c) => {
          const header = c.querySelector('.card__header');
          // If not already expanded, click header
          if (!c.classList.contains('card--expanded') && header) {
            header.click();
          }
        });
      });
      await new Promise((r) => setTimeout(r, 600));

      // ─── 1. Footing Section ───
      // F1 is first card. Select "Section" tab
      await page.evaluate(() => {
        const f1Card = document.querySelectorAll('.card')[0];
        if (f1Card) {
          const tabs = f1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Section') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      // Scroll to F1
      await page.evaluate(() => {
        const f1Card = document.querySelectorAll('.card')[0];
        f1Card?.scrollIntoView();
      });
      await page.screenshot({
        path: path.join(OUT_DIR, `1_footing_section_${theme}_${vp.name}.png`),
      });

      // ─── 2. Footing Plan ───
      await page.evaluate(() => {
        const f1Card = document.querySelectorAll('.card')[0];
        if (f1Card) {
          const tabs = f1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Plan') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(OUT_DIR, `2_footing_plan_${theme}_${vp.name}.png`),
      });

      // ─── 3. Column Section ───
      await page.evaluate(() => {
        const c1Card = document.querySelectorAll('.card')[1];
        if (c1Card) {
          c1Card.scrollIntoView();
          const tabs = c1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Section') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(OUT_DIR, `3_column_section_${theme}_${vp.name}.png`),
      });

      // ─── 4. Column Elevation ───
      await page.evaluate(() => {
        const c1Card = document.querySelectorAll('.card')[1];
        if (c1Card) {
          c1Card.scrollIntoView();
          const tabs = c1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Elevation') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(OUT_DIR, `4_column_elevation_${theme}_${vp.name}.png`),
      });

      // ─── 5. Beam Elevation ───
      await page.evaluate(() => {
        const b1Card = document.querySelectorAll('.card')[2];
        if (b1Card) {
          b1Card.scrollIntoView();
          const tabs = b1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Elevation') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(OUT_DIR, `5_beam_elevation_${theme}_${vp.name}.png`),
      });

      // ─── 6. Beam Section A-A ───
      await page.evaluate(() => {
        const b1Card = document.querySelectorAll('.card')[2];
        if (b1Card) {
          b1Card.scrollIntoView();
          const tabs = b1Card.querySelectorAll('.drawing-preview-container button');
          for (const t of tabs) {
            if (t.textContent?.trim() === 'Section A-A') {
              t.click();
              break;
            }
          }
        }
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(OUT_DIR, `6_beam_section_${theme}_${vp.name}.png`),
      });

      // ─── Modal Dialog (Expanded Modal View) ───
      // Click expand button on Beam card
      await page.evaluate(() => {
        const b1Card = document.querySelectorAll('.card')[2];
        const expandBtn = b1Card?.querySelector('.drawing-preview-container .btn-icon');
        if (expandBtn) expandBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(OUT_DIR, `modal_expanded_${theme}_${vp.name}.png`),
      });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.drawing-modal-panel .btn-icon:last-child');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await browser.close();
  console.log('All Milestone 2 screenshots captured in: ' + OUT_DIR);
}

run().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
