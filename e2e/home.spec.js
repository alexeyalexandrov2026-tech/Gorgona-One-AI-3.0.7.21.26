import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  // Go to the homepage
  await page.goto('/');

  // Check if the Discovery Room (AI Assistant) trigger exists on the page
  // This is a core component of the site
  const aiTrigger = page.locator('.ai-sphere');
  
  // Wait for it to be attached to the DOM (it might be hidden initially, but should be in the DOM)
  await expect(aiTrigger).toBeAttached({ timeout: 10000 });
});
