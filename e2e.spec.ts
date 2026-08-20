import { test, expect } from '@playwright/test';
import { resolve } from 'path';

test.describe('Moonview Admin CMS E2E', () => {
  // Use a slow mo to ensure clicks are registered
  test.use({ actionTimeout: 10000 });

  let movieTitle = `E2E Movie ${Date.now()}`;

  test('End to End CMS Flow', async ({ page }) => {
    // 1. Admin Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin_proc_test@example.com');
    await page.fill('input[type="password"]', 'admin12345');
    await page.click('button[type="submit"]');

    // Verify Dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    await expect(page.url()).toContain('/admin');

    // 2. Movie Creation
    await page.click('text=Content Management');
    await page.click('text=Add Content');
    
    // Fill movie form
    await page.fill('input[name="title"]', movieTitle);
    await page.fill('input[name="slug"]', `e2e-movie-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'E2E Testing Description');
    await page.fill('input[name="releaseYear"]', '2026');
    await page.selectOption('select[name="maturityRating"]', 'PG');
    await page.fill('input[name="duration"]', '120');
    await page.click('button:has-text("Save Content")');

    // Wait for redirect to content list
    await page.waitForURL('**/admin/content');

    // Verify it was created
    await expect(page.locator(`text=${movieTitle}`).first()).toBeVisible();

    // 3. Media Upload & FFmpeg Processing
    await page.click('text=Media Library');
    await page.setInputFiles('input[type="file"]', resolve(__dirname, 'test-video.mp4'));
    await page.click('button:has-text("Upload")');

    // Wait for READY status. This tests BullMQ, FFmpeg, and Memurai/Redis
    // It goes UPLOADING -> PENDING -> PROCESSING -> READY
    await expect(page.locator('text=READY').first()).toBeVisible({ timeout: 120000 });

    // 4. Media Association & Publish
    await page.click('text=Content Management');
    await page.click(`text=${movieTitle}`); // Click to edit
    
    // Wait for the modal/form
    await page.waitForTimeout(2000);
    
    // Select the newly uploaded video (the dropdown should have 'READY' in its text)
    // Playwright can select by text or value. The label contains '(READY)'
    await page.selectOption('select[name="mediaAssetId"]', { label: /READY/ });
    
    await page.click('button:has-text("Save Content")');
    await page.waitForURL('**/admin/content');

    // Publish the content
    await page.click(`xpath=//tr[td[contains(text(), '${movieTitle}')]]//button[text()='Publish']`);

    // Wait for Published status
    await expect(page.locator(`xpath=//tr[td[contains(text(), '${movieTitle}')]]//span[text()='PUBLISHED']`).first()).toBeVisible();
    
    console.log('Playwright E2E UI Test completed successfully!');
  });
});
