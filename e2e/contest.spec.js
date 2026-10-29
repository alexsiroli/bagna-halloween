// Pagina contest e firma: «Come partecipare» sempre aperto, /alex-siroli senza pagina personale.
import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => page.addInitScript(() => sessionStorage.setItem('splash-visto', '1')));

test('/alex-siroli porta alla home e «Alex Siroli» non e\' un link', async ({ page }) => {
  await page.goto('/alex-siroli');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  await expect(page.getByRole('link', { name: /Alex Siroli/ })).toHaveCount(0);
  await expect(page.getByText('Alex Siroli')).toBeVisible(); // la firma nel piede resta testo
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

test('contest a 390x844: il quartiere riempie lo spazio in fondo, senza scroll; a 375x667 si toglie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contest');
  await expect(page.locator('.contest-scene')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('.contest-scene')).toBeHidden();
});

test('home: le luci respirano dopo l\'apertura, ferme con movimento ridotto', async ({ page, browser }) => {
  await page.goto('/');
  await page.waitForTimeout(5000);
  const leggi = () => page.evaluate(() => [...document.querySelectorAll('.luce')].map((e) => Number(getComputedStyle(e).opacity)));
  const prima = await leggi();
  await page.waitForTimeout(1500);
  const dopo = await leggi();
  expect(dopo.some((v, i) => Math.abs(v - prima[i]) > 0.05)).toBe(true);
  const fermo = await browser.newContext({ reducedMotion: 'reduce' });
  await fermo.addInitScript(() => sessionStorage.setItem('splash-visto', '1'));
  const p2 = await fermo.newPage();
  await p2.goto('http://localhost:4101/');
  await p2.waitForTimeout(1000);
  const valori = await p2.evaluate(() => [...document.querySelectorAll('.luce')].map((e) => Number(getComputedStyle(e).opacity)));
  expect(valori.every((v) => v === 1)).toBe(true);
  await fermo.close();
});
