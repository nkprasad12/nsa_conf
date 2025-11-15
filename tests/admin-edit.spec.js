import { test, expect } from '@playwright/test';

test('enable admin mode and edit an announcement', async ({ page }) => {
  // Open app
  await page.goto('/');

  // Enable admin mode via Settings tab
  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.locator('#admin-toggle');
  await expect(toggle).toBeVisible();
  await toggle.check();

  // Go to Announcements and edit the first announcement
  await page.getByRole('button', { name: 'Announcements' }).click();
  const firstAnnouncement = page.locator('.announcement').first();
  await expect(firstAnnouncement).toBeVisible();

  // Click Edit, change title/body and save
  await firstAnnouncement.getByRole('button', { name: 'Edit' }).click();
  const titleInput = firstAnnouncement.locator('input').first();
  const bodyTextarea = firstAnnouncement.locator('textarea').first();
  await titleInput.fill('Test Edited Title');
  await bodyTextarea.fill('Test edited body from Playwright');
  await firstAnnouncement.getByRole('button', { name: 'Save' }).click();

  // Verify changes persisted in the UI
  await expect(firstAnnouncement.getByRole('heading', { level: 3 })).toHaveText('Test Edited Title');
  await expect(firstAnnouncement.locator('p')).toHaveText('Test edited body from Playwright');
});
