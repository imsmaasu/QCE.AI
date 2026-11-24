const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\SMAASU\\.gemini\\antigravity\\brain\\c84f0983-5606-4783-ab8d-1eaa4fe47228\\screenshots\\milestone21';

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

  console.log('1. Capturing Desktop 1280px...');
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Initialize sample project
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const sampleBtn = document.querySelector('.quiet-link');
    if (sampleBtn) sampleBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Expand F1 card
  await page.evaluate(() => {
    const f1Card = document.querySelectorAll('.card')[0];
    if (f1Card && !f1Card.classList.contains('card--expanded')) {
      const header = f1Card.querySelector('.card__header');
      if (header) header.click();
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 1: Home with expanded card showing Member Dimensions, Reinforcement Bars with Spacing<--->Count, and Drawing Preview
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_home_1280.png'),
  });
  console.log('Saved m21_home_1280.png');

  // Screenshot 2: Footing Section (Textbook mode)
  const f1Section = await page.evaluate(() => {
    const f1Card = document.querySelectorAll('.card')[0];
    if (f1Card) {
      f1Card.scrollIntoView();
      return true;
    }
    return false;
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_footing_section_textbook_1280.png'),
  });
  console.log('Saved m21_footing_section_textbook_1280.png');

  // Switch to Footing Plan tab
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
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_footing_plan_textbook_1280.png'),
  });
  console.log('Saved m21_footing_plan_textbook_1280.png');

  // Expand Column C1 card
  await page.evaluate(() => {
    const c1Card = document.querySelectorAll('.card')[1];
    if (c1Card) {
      if (!c1Card.classList.contains('card--expanded')) {
        const header = c1Card.querySelector('.card__header');
        if (header) header.click();
      }
      c1Card.scrollIntoView();
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Column Section
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_column_section_textbook_1280.png'),
  });
  console.log('Saved m21_column_section_textbook_1280.png');

  // Switch C1 to Elevation tab
  await page.evaluate(() => {
    const c1Card = document.querySelectorAll('.card')[1];
    if (c1Card) {
      const tabs = c1Card.querySelectorAll('.drawing-preview-container button');
      for (const t of tabs) {
        if (t.textContent?.trim() === 'Elevation') {
          t.click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_column_elevation_textbook_1280.png'),
  });
  console.log('Saved m21_column_elevation_textbook_1280.png');

  // Expand Beam B1 card
  await page.evaluate(() => {
    const b1Card = document.querySelectorAll('.card')[2];
    if (b1Card) {
      if (!b1Card.classList.contains('card--expanded')) {
        const header = b1Card.querySelector('.card__header');
        if (header) header.click();
      }
      b1Card.scrollIntoView();
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Beam Elevation
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_beam_elevation_textbook_1280.png'),
  });
  console.log('Saved m21_beam_elevation_textbook_1280.png');

  // Beam Section A-A
  await page.evaluate(() => {
    const b1Card = document.querySelectorAll('.card')[2];
    if (b1Card) {
      const tabs = b1Card.querySelectorAll('.drawing-preview-container button');
      for (const t of tabs) {
        if (t.textContent?.trim().includes('Section')) {
          t.click();
          break;
        }
      }
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_beam_section_textbook_1280.png'),
  });
  console.log('Saved m21_beam_section_textbook_1280.png');

  // Open Drawing Dialog modal
  await page.evaluate(() => {
    const b1Card = document.querySelectorAll('.card')[2];
    if (b1Card) {
      const expandBtn = b1Card.querySelector('.drawing-preview-container .btn-icon');
      if (expandBtn) expandBtn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_modal_dialog_1280.png'),
  });
  console.log('Saved m21_modal_dialog_1280.png');

  // Close modal with Escape
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // Switch to Color Mode via Drawing Preview style switch
  await page.evaluate(() => {
    const colorBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Color'
    );
    if (colorBtn) colorBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_drawing_color_mode_1280.png'),
  });
  console.log('Saved m21_drawing_color_mode_1280.png');

  // Navigate to Sheet view
  await page.evaluate(() => {
    const sheetBtn = Array.from(document.querySelectorAll('button, a')).find(
      (b) => b.textContent?.trim() === 'Sheet'
    );
    if (sheetBtn) sheetBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_sheet_page_1280.png'),
  });
  console.log('Saved m21_sheet_page_1280.png');

  // ─── Mobile 390px ───
  console.log('2. Capturing Mobile 390px...');
  await page.setViewport({ width: 390, height: 844 });
  // Navigate back to Project view
  await page.evaluate(() => {
    const projBtn = Array.from(document.querySelectorAll('button, a')).find(
      (b) => b.textContent?.trim() === 'Project'
    );
    if (projBtn) projBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm21_card_expanded_390.png'),
  });
  console.log('Saved m21_card_expanded_390.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
