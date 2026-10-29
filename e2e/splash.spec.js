// Splash d'apertura: una volta per sessione, mai sulle route di voto e admin, saltabile.
import { expect, test } from '@playwright/test';

const splash = (page) => page.locator('.splash');

test('splash: compare su /, la seconda visita nella sessione no', async ({ page }) => {
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await expect(splash(page)).toContainText('Halloween di Bagnarola');
  await expect(splash(page)).toContainText('app di Alex Siroli');
  await expect(splash(page)).toHaveAttribute('aria-hidden', 'true');
  // Il contenuto sotto e' gia' montato, senza aspettare la fine.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  await expect(splash(page)).toHaveCount(0, { timeout: 4000 }); // chiude da solo (2,5 s)

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(splash(page)).toHaveCount(0);
});

test('splash: sparisce al click', async ({ page }) => {
  await page.goto('/');
  await splash(page).click();
  await expect(splash(page)).toHaveCount(0);
});

test('splash: sparisce con Esc', async ({ page }) => {
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(splash(page)).toHaveCount(0);
});

for (const path of ['/vota/3', '/vote', '/admin']) {
  test(`splash: assente su ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(splash(page)).toHaveCount(0);
  });
}

test('splash: senza sessionStorage si mostra e si chiude da solo, senza errori', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.addInitScript(() => {
    // Nega solo la chiave dello splash: lo storage del resto dell'app (Firebase Auth) non c'entra.
    for (const method of ['getItem', 'setItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key, ...rest) {
        if (key === 'splash-visto') throw new DOMException('negato', 'SecurityError');
        return original.call(this, key, ...rest);
      };
    }
  });
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await expect(splash(page)).toHaveCount(0, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test('splash: con movimento ridotto e statico e dura meno di 0,8 s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await expect(page.locator('.splash__bat').first()).toBeHidden();
  await expect(splash(page)).toHaveCount(0, { timeout: 800 }); // deve fallire se supera 0,8 s
});
