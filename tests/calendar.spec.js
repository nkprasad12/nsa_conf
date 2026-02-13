import { test, expect } from '@playwright/test';

test('clicking calendar event opens details dialog', async ({ page }) => {
  // navigate to the served app root (webServer in playwright.config.js provides the base)
  await page.goto('/');

  // Click the "Calendar" tab to render the CalendarView
  await page.getByRole('button', { name: 'Calendar' }).click();

  // Wait for the calendar wrapper and FullCalendar root to be present
  await page.locator('.calendar-wrapper').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('.calendar-wrapper .fc').waitFor({ state: 'visible', timeout: 20000 });

  // Wait for the sample event text to appear and click it
  const titleText = 'Opening Keynote';
  const event = page.getByText(titleText).first();
  await expect(event).toBeVisible({ timeout: 20000 });
  await event.click();

  // Modal uses role="dialog"
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await expect(dialog).toContainText(titleText);
});
