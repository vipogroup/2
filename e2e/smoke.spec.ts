import { test, expect } from '@playwright/test';

test('home responds without server error', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
});
