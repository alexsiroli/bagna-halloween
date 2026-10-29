// Pagina contest e firma: regolamento apribile, /alex-siroli senza pagina personale.
import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => page.addInitScript(() => sessionStorage.setItem('splash-visto', '1')));

test('/alex-siroli porta alla home e «Alex Siroli» non e\' un link', async ({ page }) => {
  await page.goto('/alex-siroli');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  await expect(page.getByRole('link', { name: /Alex Siroli/ })).toHaveCount(0);
  await expect(page.getByText('Alex Siroli')).toBeVisible(); // la firma nel piede resta testo
});

test('contest a 375x667: regolamento chiuso senza scorrimento, aperto mostra il testo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/contest');
  const regolamento = page.locator('details.contest-rules');
  await expect(regolamento.locator('summary')).toHaveText('Regolamento');
  await expect(regolamento).not.toHaveAttribute('open', '');
  await expect(page.getByText('Profilo pubblico obbligatorio')).toBeHidden();
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
  expect(fits).toBe(true);

  const box = await regolamento.locator('summary').boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await regolamento.locator('summary').click();
  await expect(page.getByText('Profilo pubblico obbligatorio')).toBeVisible();
});
