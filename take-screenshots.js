const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  
  const artifactDir = 'C:/Users/alexa/.gemini/antigravity-ide/brain/034e171c-fb33-458f-a4ae-277dc24e973c';
  
  // Wait a bit to ensure the dev server is fully up
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Navigating to rentals list...');
  await page.goto('http://localhost:3000/rentals', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactDir, 'rentals-list.png'), fullPage: true });

  console.log('Navigating to Mercedes detail...');
  await page.goto('http://localhost:3000/rentals/mercedes-amg-cle-53-cabriolet', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactDir, 'mercedes-detail.png'), fullPage: true });

  await browser.close();
  console.log('Screenshots taken');
})();
