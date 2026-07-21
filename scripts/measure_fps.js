const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('Measuring FPS over 5 seconds of scrolling...');
  
  const result = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      let lastTime = performance.now();
      let isMeasuring = true;

      const measure = (time) => {
        if (!isMeasuring) return;
        frames++;
        requestAnimationFrame(measure);
      };

      requestAnimationFrame(measure);

      // Simulate some scrolling to trigger repaints
      let scrollY = 0;
      const scrollInterval = setInterval(() => {
        scrollY += 50;
        window.scrollTo(0, scrollY);
      }, 16); // ~60fps scroll intent

      setTimeout(() => {
        isMeasuring = false;
        clearInterval(scrollInterval);
        const now = performance.now();
        const duration = (now - lastTime) / 1000;
        const fps = Math.round(frames / duration);
        resolve({ frames, duration, fps });
      }, 5000);
    });
  });

  console.log('--- PERFORMANCE RESULTS ---');
  console.log(`Total Frames: ${result.frames}`);
  console.log(`Duration: ${result.duration.toFixed(2)} seconds`);
  console.log(`Average FPS: ${result.fps}`);
  
  if (result.fps >= 55) {
    console.log('Status: EXCELLENT (Buttery smooth)');
  } else if (result.fps >= 30) {
    console.log('Status: GOOD (Acceptable for web)');
  } else {
    console.log('Status: POOR (Needs optimization)');
  }

  await browser.close();
})();
