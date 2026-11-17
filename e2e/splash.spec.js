// Splash d'apertura «Orbita» (#76): una volta per sessione, mai sulle route di voto e admin, saltabile.
import { expect, test } from '@playwright/test';

const splash = (page) => page.locator('.splash');

test('splash: compare su /, la seconda visita nella sessione no', async ({ page }) => {
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await expect(splash(page)).toHaveText('Alx Studio'); // nessun altro testo, nemmeno in fondo
  await expect(splash(page)).toHaveAttribute('aria-hidden', 'true');
  // Il contenuto sotto e' gia' montato, senza aspettare la fine.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  await expect(splash(page)).toHaveCount(0, { timeout: 4000 }); // chiude da solo (1,5 s)

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

test('splash: con movimento ridotto la zucca resta ferma e chiude in 1,5 s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(splash(page)).toBeVisible();
  await expect(splash(page)).toHaveClass(/sp-gioca/);
  expect(await page.locator('.splash .dotF').evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(splash(page)).toHaveCount(0, { timeout: 2200 }); // deve fallire se supera la durata standard
});

test('splash: se la pagina non ha finito di caricare resta ferma sull\'icona, poi esce', async ({ page }) => {
  let libera;
  const fermo = new Promise((ok) => { libera = ok; });
  await page.route('**/fonts/bowlby-one-latin.woff2', async (route) => { await fermo; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(splash(page)).toHaveClass(/sp-gioca/, { timeout: 30_000 }); // animazione partita
  await page.waitForTimeout(2500); // oltre la fine dell'animazione (1,5 s)
  await expect(splash(page)).toBeVisible();
  libera();
  await expect(splash(page)).toHaveCount(0, { timeout: 2000 });
});

// Dalla Home di iPhone la pagina sta sotto la barra di stato (viewport 793 su uno schermo di 852): la splash aggiunge la
// barra in fondo per restare centrata sullo schermo intero, anche dopo una tastiera aperta (barraSopra.js).
test.describe('splash nella web app sulla Home di iPhone', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    viewport: { width: 393, height: 793 },
  });

  test('alza il marchio di mezza barra di stato e tiene la misura con la tastiera', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });
      Object.defineProperty(Screen.prototype, 'height', { get: () => 852 }); // l'opzione screen non arriva col profilo Pixel 7
    });
    await page.route('**/fonts/bowlby-one-latin.woff2', () => {}); // la splash resta aperta per tutta la prova
    await page.goto('/', { waitUntil: 'commit' });
    const barra = () => splash(page).evaluate((el) => el.style.getPropertyValue('--barra'));
    await expect.poll(barra, { timeout: 30_000 }).toBe('59px'); // il server di sviluppo sotto carico e' lento
    await page.setViewportSize({ width: 393, height: 500 }); // tastiera aperta
    await expect.poll(barra).toBe('59px');
    await page.setViewportSize({ width: 393, height: 852 }); // iOS riporta la pagina a tutto schermo
    await expect.poll(barra).toBe('0px');
  });
});
