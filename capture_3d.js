const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // Navigate to fleet page
  await page.goto('http://localhost:3000/fleet');
  await page.waitForTimeout(2000); // let animations load
  
  // Click the first railcar row to open the 3D modal
  await page.click('text=BNSF 482011');
  console.log("Clicked railcar, waiting for 3D modal...");
  
  // Wait for R3F canvas to appear
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000); // let the 3D model render
  
  // Take screenshot of the base 3D modal
  await page.screenshot({ path: '/Users/cornelius/.gemini/antigravity/brain/0430fbd1-6c10-44d9-a0b7-af916d1bb6a2/railcar_modal_base.png' });
  console.log("Captured base 3D modal screenshot");
  
  // Try to click in the exact center to hit one of the top hatch spheres
  // The camera position is [5, 3, 7], fov 40, looking roughly at [0,0,0]
  // Node 2 (center hopper) top hatch is at [0, 1.25, 0] in world space
  // We'll click slightly above the center of the canvas
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 50);
      console.log("Clicked center of canvas to try hitting a node");
  }
  
  await page.waitForTimeout(1000); // wait for HTML popup to appear
  
  // Take screenshot of the node popup
  await page.screenshot({ path: '/Users/cornelius/.gemini/antigravity/brain/0430fbd1-6c10-44d9-a0b7-af916d1bb6a2/railcar_modal_popup.png' });
  console.log("Captured interactive 3D modal screenshot");

  await browser.close();
})();
