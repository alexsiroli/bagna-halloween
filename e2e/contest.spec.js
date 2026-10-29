// Pagina contest e firma: «Come partecipare» sempre aperto, /alex-siroli senza pagina personale.
import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => page.addInitScript(() => sessionStorage.setItem('splash-visto', '1')));

test('/alex-siroli porta alla home e «Alex Siroli» nel piede e\' un link email', async ({ page }) => {
  await page.goto('/alex-siroli');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  const firma = page.getByRole('link', { name: 'Alex Siroli' });
  await expect(firma).toHaveAttribute('href', 'mailto:alex.siroli@gmail.com?subject=Halloween%20a%20Bagnarola');
  expect((await firma.boundingBox()).height).toBeGreaterThanOrEqual(43);
});

test('contest a 375x667: «Come partecipare» sempre visibile, niente premio, una schermata', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/contest');
  await expect(page.getByRole('heading', { name: 'Come partecipare' })).toBeVisible();
  await expect(page.getByText('Profilo pubblico obbligatorio')).toBeVisible();
  await expect(page.getByText(/premio|regolamento/i)).toHaveCount(0);
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
  expect(fits).toBe(true);
});
