// Smoke sugli emulatori Firebase (seed: scripts/seed-emulator.mjs). Mai la produzione.
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

// Lo splash d'apertura copre la pagina: qui e' gia' "visto" (e2e/splash.spec.js lo prova da solo).
test.beforeEach(({ page }) => page.addInitScript(() => sessionStorage.setItem('splash-visto', '1')));

// Login dal popup dell'emulatore auth, scegliendo un utente creato dal seed.
async function login(page, email) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Accedi con Google' }).click();
  const popup = await popupPromise;
  // Il widget dell'emulatore aggancia i click solo a pagina caricata.
  await popup.waitForLoadState('load');
  await popup.getByText(email).click();
  await popup.waitForEvent('close');
}

// Le tessere OpenStreetMap non si scaricano mai nei test: i segnaposto non ne dipendono.
const blockTiles = (page) => page.route('**://tile.openstreetmap.org/**', (route) => route.abort());

// File dei punti di prova al posto di public/punti/<edizione>.json (che non esiste finche' non si genera).
const PUNTI = fileURLToPath(new URL('./fixtures/punti.json', import.meta.url));
const servePoints = (page) => page.route('**/punti/*.json', (route) => route.fulfill({ path: PUNTI, contentType: 'application/json' }));

test('home: edizione dalla config e accesso al voto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halloween di Bagnarola');
  await expect(page.getByText('Edizione 2026')).toBeVisible();
  // Da freddo la config arriva tardi: la scritta compare solo a config caricata.
  await expect(page.getByText('votazioni aperte')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Vota le case' }).click();
  await expect(page).toHaveURL(/\/vote$/);
});

test('privacy: dal link accanto al login la pagina si apre', async ({ page }) => {
  await page.goto('/vote');
  await page.getByRole('main').getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByText('privacy@alxstudio.it').first()).toBeVisible();
  await expect(page.getByText('La mappa non usa cookie.')).toBeVisible();
  await expect(page.getByText(/La mappa è di OpenStreetMap Foundation.*OpenStreetMap non lavora per noi/)).toBeVisible();
  await expect(page.getByText('Google e Netlify trattano i dati per nostro conto.')).toBeVisible();
  await expect(page.getByText(/^OpenStreetMap Foundation/)).toHaveCount(0); // non e' piu' tra i destinatari "per nostro conto"
  await expect(page.getByText(/via e numero civico, pubblicati con il consenso/)).toBeVisible();
});

test('mappa: segnaposto e scheda di voto, solo mappa e legenda', async ({ page }) => {
  await blockTiles(page);
  // Mai il file reale dei punti: qui c'e' sempre "nessun file" (il server risponde con l'HTML dell'app).
  await page.route('**/punti/*.json', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>x</title>' }));
  const errors = [];
  page.on('console', (msg) => {
    // Le tessere bloccate fanno scrivere un errore al browser: non e' un errore dell'app.
    if (msg.type() === 'error' && !msg.location().url.includes('tile.openstreetmap.org')) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/mappa');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(10);
  await expect(page.getByText('© OpenStreetMap')).toBeVisible();

  await page.getByRole('button', { name: /^Casa 1, La Casa delle Zucche/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Casa 1' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Via Cesenatico 12');
  // Senza accesso la scheda chiede il login (la stessa scheda di /vote).
  await expect(dialog.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Chiudi' }).click();
  await expect(dialog).toBeHidden();

  // Niente elenchi sotto la mappa: le case senza posizione si votano da /vote.
  await expect(page.getByRole('link', { name: /^Vota la casa/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Altre case' })).toHaveCount(0);
  expect(errors).toEqual([]);

  // Senza file dei punti (qui il server risponde con l'HTML dell'app) restano solo le case e la legenda dei loro tipi.
  await expect(page.getByRole('button', { name: /^Bar:/ })).toHaveCount(0);
  await expect(page.locator('.map-legend')).toContainText('Casa addobbata');
  await expect(page.locator('.map-legend')).not.toContainText('Bar');
});

test('mappa: accesso e voto dalla scheda, la casetta si accende', async ({ page }) => {
  await blockTiles(page);
  await page.goto('/mappa');
  // I segnaposto di prova sono quasi sovrapposti: un tocco vero finirebbe sulla casa vicina, il click va sul suo elemento.
  await page.getByRole('button', { name: /^Casa 2, / }).dispatchEvent('click');
  const dialog = page.getByRole('dialog', { name: 'Casa 2' });
  await login(page, 'curioso@esempio.test');
  // Dopo l'accesso la stessa scheda mostra le zucche; il profilo compare in alto a destra.
  const eight = dialog.getByRole('radio', { name: '8 su 10' });
  const score = (await eight.getAttribute('aria-checked')) === 'true' ? 9 : 8;
  await dialog.getByRole('radio', { name: `${score} su 10` }).click();
  await dialog.getByRole('button', { name: 'Salva voto' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/mappa$/);
  await expect(page.getByRole('button', { name: new RegExp(`^Casa 2, .*votata ${score} su 10`) })).toBeVisible();
  await expect(page.locator('.pin__disc[data-lit="true"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Profilo: / })).toBeVisible();
});

test('mappa: tipi di casa, punti di servizio e strade chiuse da file', async ({ page }) => {
  await blockTiles(page);
  await servePoints(page);
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.location().url.includes('tile.openstreetmap.org')) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/mappa');
  // 10 case + 5 punti validi (il tipo sconosciuto e la strada con un solo punto sono scartati).
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(15);
  // Ogni casa sta sopra ogni punto di servizio: un punto vicino non copre mai la casa da votare.
  const layers = await page.locator('.leaflet-marker-icon').evaluateAll((els) =>
    els.map((el) => ({ house: (el.getAttribute('aria-label') || '').startsWith('Casa '), z: Number(el.style.zIndex) })),
  );
  expect(Math.min(...layers.filter((l) => l.house).map((l) => l.z))).toBeGreaterThan(Math.max(...layers.filter((l) => !l.house).map((l) => l.z)));
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(1);
  await expect(page.locator('.leaflet-overlay-pane path.leaflet-interactive')).toHaveCount(0);
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCSS('stroke', 'rgb(217, 83, 58)'); // --strada-chiusa
  // Un solo segnaposto per casa: un cerchietto col numero, mai una casetta.
  await expect(page.locator('.pin__disc')).toHaveCount(10);
  await expect(page.locator('.pin .casetta')).toHaveCount(0);
  // Il tipo e' nel nome accessibile e nel glifo del segnaposto.
  const show = page.getByRole('button', { name: 'Casa 3, La Cripta del Fornaio, spettacolo: apri la scheda' });
  const decor = page.getByRole('button', { name: 'Casa 4, Ragnatele in Giardino, casa addobbata: apri la scheda' });
  // Glifo del tipo attaccato al cerchietto; la casa senza tipo ha solo il numero.
  await expect(show.locator('svg')).toHaveCount(1);
  await expect(decor.locator('svg')).toHaveCount(1);
  expect(await show.innerHTML()).not.toBe(await decor.innerHTML());
  await expect(page.getByRole('button', { name: /^Casa 5, La Strega del Canale: apri/ }).locator('svg')).toHaveCount(0);
  // Il glifo non copre il numero: i due rettangoli non si sovrappongono.
  const overlap = await show.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el.querySelector('.pin__disc'));
    const n = range.getBoundingClientRect();
    const g = el.querySelector('.pin__tipo').getBoundingClientRect();
    return n.left < g.right && g.left < n.right && n.top < g.bottom && g.top < n.bottom;
  });
  expect(overlap).toBe(false);

  // Legenda in testo, solo i tipi presenti, con la nota del file.
  const legend = page.locator('.map-legend');
  for (const label of ['Spettacolo', 'Casa addobbata', 'Bar', 'Food truck', 'Servizi igienici', 'Parcheggio', 'Intrattenimento', 'Strada chiusa']) {
    await expect(legend.getByRole('listitem').filter({ hasText: label })).toHaveCount(1);
  }
  await expect(legend).toContainText('dalle 18:30 alle 23:00');

  // Un tocco su un punto: la scheda dal basso con tipo, nome e indirizzo (come testo), niente Vota e niente popup di Leaflet.
  // Con lo zoom sulle sole case i punti possono stare fuori vista: il click va sul loro elemento.
  await page.getByRole('button', { name: 'Bar: Bar <b>DJ</b> set' }).dispatchEvent('click');
  const sheet = page.getByRole('dialog', { name: 'Bar <b>DJ</b> set' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Bar <b>DJ</b> set');
  await expect(sheet).toContainText('Via di Prova 9');
  await expect(sheet.locator('b')).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: /Salva voto|Accedi/ })).toHaveCount(0);
  await expect(page.locator('.leaflet-popup')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Chiudi' }).click();
  await expect(sheet).toBeHidden();

  // Niente elenco «Spettacoli» sotto la mappa: i punti di intrattenimento restano segnaposto.
  await expect(page.getByRole('heading', { name: 'Spettacoli' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Intrattenimento: Trampolieri di prova/ })).toHaveCount(1);

  // La scheda della casa porta l'etichetta del tipo.
  await show.click();
  await expect(page.getByRole('dialog', { name: 'Casa 3' })).toContainText('Spettacolo');
  expect(errors).toEqual([]);
});

for (const [name, contentType, body] of [
  ['HTML del redirect', 'text/html', '<!doctype html><title>x</title>'],
  ['JSON non valido', 'application/json', '{ rotto'],
]) {
  test(`mappa: file dei punti con ${name} = nessun punto, nessun errore`, async ({ page }) => {
    await blockTiles(page);
    await page.route('**/punti/*.json', (route) => route.fulfill({ contentType, body }));
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.location().url.includes('tile.openstreetmap.org')) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/mappa');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(10);
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

// «Portami qui»: solo le coordinate e il modo a piedi (Pixel 7 = Android = Google Maps), in una nuova scheda, bersaglio da 44 px.
const expectDirections = async (link, lat, lng) => {
  await expect(link).toHaveAttribute('href', `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
};

test('mappa: la scheda di una casa ha numero, nome, via e «Portami qui» con le sue coordinate', async ({ page }) => {
  await blockTiles(page);
  await page.goto('/mappa');
  await page.getByRole('button', { name: /^Casa 1, La Casa delle Zucche/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Casa 1' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('La Casa delle Zucche');
  await expect(sheet).toContainText('Via Cesenatico 12');
  await expectDirections(sheet.getByRole('link', { name: 'Portami qui' }), 44.2005, 12.338);
});

test('mappa: tocco su un parcheggio apre la scheda dal basso con tipo, nome, indirizzo e «Portami qui»', async ({ page }) => {
  await blockTiles(page);
  await servePoints(page);
  await page.goto('/mappa');
  // I punti di servizio possono stare fuori vista (la mappa inquadra le case): il click va sul loro elemento.
  await page.getByRole('button', { name: 'Parcheggio: Parcheggio di prova' }).dispatchEvent('click');
  const sheet = page.getByRole('dialog', { name: 'Parcheggio di prova' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Parcheggio'); // il tipo, da POINT_LABELS
  await expect(sheet).toContainText('Via del Parcheggio');
  await expectDirections(sheet.getByRole('link', { name: 'Portami qui' }), 44.2022, 12.3445);
  // Foglio dal basso: il fondo della scheda sta sul fondo della finestra (a fine animazione).
  const bottom = async () => {
    const box = await sheet.locator('.sheet__body').boundingBox();
    return Math.round(box.y + box.height);
  };
  await expect.poll(bottom).toBe(page.viewportSize().height);
  await expect(page.locator('.leaflet-popup')).toHaveCount(0);
});

test('mappa: all\'apertura inquadra le case; i servizi che arrivano dopo non spostano la vista', async ({ page }) => {
  await blockTiles(page);
  // I punti arrivano dopo un secondo e mezzo: con un secondo inquadramento la vista si sposterebbe.
  await page.route('**/punti/*.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ path: PUNTI, contentType: 'application/json' });
  });
  await page.goto('/mappa');
  await expect(page.locator('.leaflet-marker-icon[aria-label^="Casa "]')).toHaveCount(10);

  // Posizione dei segnaposto delle case (rispetto al centro della mappa: la legenda che arriva con i servizi la accorcia) e zoom
  // (dalla distanza fra la casa 5 e la 4: 0,0081 gradi di longitudine), a vista ferma.
  const view = () =>
    page.evaluate(() => {
      const box = document.querySelector('.house-map').getBoundingClientRect();
      const centers = Object.fromEntries(
        [...document.querySelectorAll('.leaflet-marker-icon[aria-label^="Casa "]')].map((el) => {
          const r = el.getBoundingClientRect();
          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          return [el.getAttribute('aria-label').match(/^Casa (\d+),/)[1], [Math.round(r.x + r.width / 2 - cx), Math.round(r.y + r.height / 2 - cy)]];
        }),
      );
      const inside = Object.values(centers).every(([x, y]) => Math.abs(x) < box.width / 2 && Math.abs(y) < box.height / 2);
      const zoom = Math.round(Math.log2(((centers[4][0] - centers[5][0]) * 360) / (0.0081 * 256)));
      return JSON.stringify({ centers, inside, zoom });
    });
  const settled = async () => {
    let last = await view();
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(300);
      const now = await view();
      if (now === last) return JSON.parse(now);
      last = now;
    }
    throw new Error('la vista non si ferma');
  };

  const before = await settled();
  expect(before.inside).toBe(true); // tutte le case dentro la vista
  expect(before.zoom).toBeGreaterThanOrEqual(15);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(15); // arrivati i punti
  expect(await settled()).toEqual(before);
});

// Case 13-20 (senza posizione) in piu' sull'emulatore: /vote con 20 case. Si tolgono sempre a fine test.
const EXTRA_HOUSES = [13, 14, 15, 16, 17, 18, 19, 20];
const HOUSE_DOC = (n) => `http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/houses/2026_${n}`;
const OWNER = { Authorization: 'Bearer owner' }; // salta le regole, solo sull'emulatore
const addExtraHouses = (request) =>
  Promise.all(
    EXTRA_HOUSES.map((n) =>
      request.patch(HOUSE_DOC(n), {
        headers: OWNER,
        data: {
          fields: {
            number: { integerValue: String(n) },
            title: { stringValue: `Casa di prova ${n}` },
            edition: { integerValue: '2026' },
            visible: { booleanValue: true },
            street: { stringValue: 'Via di Prova' },
            civic: { stringValue: String(n) },
          },
        },
      }),
    ),
  );
const removeExtraHouses = (request) => Promise.all(EXTRA_HOUSES.map((n) => request.delete(HOUSE_DOC(n), { headers: OWNER })));

for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`vota: con 20 case la pagina non scorre a ${size.width}x${size.height}, griglia a righe uguali, nessuna legenda «Spettacolo»`, async ({ page, request }) => {
    await blockTiles(page);
    await page.setViewportSize(size);
    try {
      await addExtraHouses(request);
      await page.goto('/vote');
      await login(page, 'curioso@esempio.test');
      const grid = page.locator('.my-votes-grid');
      await expect(grid.getByRole('button')).toHaveCount(20);

      const layout = await page.evaluate(() => {
        const g = document.querySelector('.my-votes-grid');
        const cells = [...g.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
        const box = g.getBoundingClientRect();
        const list = document.querySelector('.my-votes');
        return {
          pageFits: document.documentElement.scrollHeight <= window.innerHeight,
          listFits: list.scrollHeight <= list.clientHeight,
          columns: getComputedStyle(g).gridTemplateColumns.split(' ').length,
          rows: new Set(cells.map((r) => Math.round(r.top))).size,
          heights: new Set(cells.map((r) => Math.round(r.height))).size,
          minSide: Math.min(...cells.map((r) => Math.min(r.width, r.height))),
          fillsWidth: Math.abs(Math.max(...cells.map((r) => r.right)) - box.right) < 2 && Math.abs(Math.min(...cells.map((r) => r.left)) - box.left) < 2,
        };
      });
      expect(layout.pageFits).toBe(true);
      expect(layout.listFits).toBe(true); // nemmeno la lista scorre al suo interno
      expect(layout.columns).toBe(5); // 20 case: 5 colonne x 4 righe, da 360 px in su
      expect(layout.rows).toBe(4);
      expect(layout.heights).toBe(1); // righe tutte uguali
      expect(layout.minSide).toBeGreaterThanOrEqual(44);
      expect(layout.fillsWidth).toBe(true);
      await expect(page.locator('.my-votes-key')).toHaveCount(0);
      await expect(page.getByText('Spettacolo')).toHaveCount(0);
      // Il tipo resta nel nome accessibile.
      await expect(grid.getByRole('button', { name: /^Casa 1, La Casa delle Zucche, spettacolo,/ })).toBeVisible();

      // Scheda di una casa con posizione: «Portami qui». Senza posizione (casa 11): niente link, ma la via c'e'.
      await grid.getByRole('button', { name: /^Casa 1, / }).click();
      const sheet = page.getByRole('dialog', { name: 'Casa 1' });
      await expect(sheet).toContainText('Via Cesenatico 12');
      await expectDirections(sheet.getByRole('link', { name: 'Portami qui' }), 44.2005, 12.338);
      await sheet.getByRole('button', { name: 'Annulla' }).click();
      await expect(sheet).toBeHidden();
      await grid.getByRole('button', { name: /^Casa 11, / }).click();
      const noPlace = page.getByRole('dialog', { name: 'Casa 11' });
      await expect(noPlace).toContainText('Via Cesenatico 150');
      await expect(noPlace.getByRole('link', { name: 'Portami qui' })).toHaveCount(0);
    } finally {
      await removeExtraHouses(request);
    }
  });
}

test('voto: login emulatore, zucche, voto salvato', async ({ page }) => {
  await page.goto('/vote');
  await login(page, 'votante@esempio.test');
  await expect(page.getByRole('button', { name: 'Profilo: Votante di prova' })).toBeVisible();
  await expect(page.getByText(/^Ciao/)).toHaveCount(0);

  await page.getByLabel('Inserisci numero casa').fill('3');
  await page.getByRole('button', { name: 'Cerca' }).click();
  const dialog = page.getByRole('dialog', { name: 'Casa 3' });
  await expect(dialog).toBeVisible();

  // Se il test gira due volte sullo stesso seed, 8 e' gia' scelto: toccarlo di nuovo lo toglierebbe.
  const eight = dialog.getByRole('radio', { name: '8 su 10' });
  const score = (await eight.getAttribute('aria-checked')) === 'true' ? 9 : 8;
  await dialog.getByRole('radio', { name: `${score} su 10` }).click();
  await dialog.getByRole('button', { name: 'Salva voto' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Voto salvato' })).toContainText(`casa 3, ${score} su 10`);
  await expect(page.getByRole('button', { name: /^Casa 3, / })).toContainText(String(score));
  await expect(page.getByRole('button', { name: /^Casa 3, / }).locator('.casetta')).toHaveAttribute('data-lit', 'true');

  // Profilo: nome, email ed Esci.
  await page.getByRole('button', { name: 'Profilo: Votante di prova' }).click();
  const profile = page.getByRole('dialog', { name: 'Votante di prova' });
  await expect(profile).toContainText('votante@esempio.test');
  await profile.getByRole('button', { name: 'Esci' }).click();
  await expect(page.getByRole('heading', { name: 'Accedi per votare' })).toBeVisible();
});

// Ogni pagina pubblica in una schermata sola, senza scorrere (piede fisso compreso).
for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`una schermata a ${size.width}x${size.height}: home, voto, mappa, contest, albo`, async ({ page }) => {
    await blockTiles(page);
    await page.setViewportSize(size);
    for (const path of ['/', '/vote', '/mappa', '/contest', '/albo']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
      expect(fits, path).toBe(true);
    }
  });
}

test('admin: il vecchio indirizzo /admin-halloween-2025 e una pagina non trovata, senza redirect', async ({ page }) => {
  await page.goto('/admin-halloween-2025');
  await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
  await expect(page).toHaveURL(/\/admin-halloween-2025$/);
});

test('admin: rifiuta chi non e in lista, accetta un admin', async ({ page }) => {
  await page.goto('/admin');
  await login(page, 'curioso@esempio.test');
  await expect(page.getByRole('alert')).toContainText('non è autorizzato');
  await expect(page.getByRole('heading', { name: 'Area admin' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Esci e cambia account' }).click();
  await login(page, 'admin@esempio.test');
  await expect(page.getByRole('heading', { name: 'Area admin' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gestione case' })).toBeVisible();
});

test('admin: aggiunge e toglie un admin (con conferma), la propria email e l ultimo admin non si tolgono', async ({ page, request }) => {
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/config/admins?updateMask.fieldPaths=emails';
  const nuovo = `nuovo-${Date.now()}@esempio.test`;
  const panel = page.locator('section.admin-emails');
  const row = panel.getByRole('listitem').filter({ hasText: nuovo });
  try {
    await page.goto('/admin');
    await login(page, 'admin@esempio.test');
    // Un solo admin: nessun «Togli», con la spiegazione.
    await expect(panel.getByRole('listitem')).toHaveCount(1);
    await expect(panel.getByRole('listitem')).toContainText('admin@esempio.test (tu)');
    await expect(panel.getByRole('button', { name: /^Togli/ })).toHaveCount(0);
    await expect(panel).toContainText('Resta un solo admin');

    // Email non valida e doppione: errore, niente scrittura.
    await panel.getByLabel('Nuova email admin').fill('non-una-email');
    await panel.getByRole('button', { name: 'Aggiungi' }).click();
    await expect(panel.getByRole('alert')).toContainText('non valido');
    await panel.getByLabel('Nuova email admin').fill(' Admin@Esempio.test ');
    await panel.getByRole('button', { name: 'Aggiungi' }).click();
    await expect(panel.getByRole('alert')).toContainText('è già admin');
    await expect(panel.getByRole('listitem')).toHaveCount(1);

    // Aggiunta: trim e minuscolo.
    await panel.getByLabel('Nuova email admin').fill(`  ${nuovo.toUpperCase()} `);
    await panel.getByRole('button', { name: 'Aggiungi' }).click();
    await expect(row).toBeVisible();
    await expect(panel.getByRole('alert')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: /^Togli/ })).toHaveCount(1); // solo l'altro, mai la propria

    // Togli: conferma, poi sparisce.
    await panel.getByRole('button', { name: `Togli ${nuovo}` }).click();
    const dialog = page.getByRole('dialog', { name: `Togliere ${nuovo}?` });
    await dialog.getByRole('button', { name: 'Annulla' }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();
    await panel.getByRole('button', { name: `Togli ${nuovo}` }).click();
    await dialog.getByRole('button', { name: 'Togli' }).click();
    await expect(row).toHaveCount(0);
    await expect(panel.getByRole('listitem')).toHaveCount(1);
  } finally {
    // Rimette l'elenco com'era nel seed (solo emulatore).
    await request.patch(url, {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: { emails: { arrayValue: { values: [{ stringValue: 'admin@esempio.test' }] } } } },
    });
  }
});

test('admin: tocco sulla mappa posiziona la casa, il segnaposto compare in /mappa', async ({ page, request }) => {
  await blockTiles(page);
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/houses/2026_11?updateMask.fieldPaths=lat&updateMask.fieldPaths=lng';
  try {
    await page.goto('/admin');
    await login(page, 'admin@esempio.test');
    await page.getByRole('button', { name: 'Modifica casa 11' }).click();
    const dialog = page.getByRole('dialog', { name: 'Modifica casa 11' });
    await expect(dialog.getByLabel('Via')).toHaveValue('Via Cesenatico');
    await expect(dialog.getByLabel('Latitudine')).toHaveValue('');

    await dialog.locator('.house-map--picker').click();
    await expect(dialog.getByLabel('Latitudine')).not.toHaveValue('');
    await expect(dialog.getByLabel('Longitudine')).not.toHaveValue('');
    await expect(dialog.locator('.leaflet-marker-icon')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Salva' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('sulla mappa').first()).toBeVisible();

    // Il ricarico e' una nuova sessione: la mappa pubblica rilegge le case.
    await page.goto('/mappa');
    await expect(page.getByRole('button', { name: /^Casa 11, Il Portico delle Candele/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vota la casa 11' })).toHaveCount(0);
  } finally {
    // Rimette la casa senza posizione (campi tolti con l'updateMask): il seed resta com'era.
    await request.patch(url, { headers: { Authorization: 'Bearer owner' }, data: { fields: {} } });
  }
});

test('admin: il tipo della casa si sceglie nel modulo e compare sulla mappa', async ({ page, request }) => {
  await blockTiles(page);
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/houses/2026_5?updateMask.fieldPaths=kind';
  try {
    await page.goto('/admin');
    await login(page, 'admin@esempio.test');
    await page.getByRole('button', { name: 'Modifica casa 1', exact: true }).click();
    const first = page.getByRole('dialog', { name: 'Modifica casa 1' });
    await expect(first.getByLabel('Tipo')).toHaveValue('spettacolo');
    await first.getByRole('button', { name: 'Annulla' }).click();

    await page.getByRole('button', { name: 'Modifica casa 5', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Modifica casa 5' });
    await expect(dialog.getByLabel('Tipo')).toHaveValue('');
    await dialog.getByLabel('Tipo').selectOption('addobbi');
    await dialog.getByRole('button', { name: 'Salva' }).click();
    await expect(dialog).toBeHidden();

    await page.goto('/mappa');
    await expect(page.getByRole('button', { name: /^Casa 5, La Strega del Canale, casa addobbata, da votare: apri/ })).toBeVisible();
  } finally {
    // Toglie il campo (updateMask senza valore): il seed resta com'era.
    await request.patch(url, { headers: { Authorization: 'Bearer owner' }, data: { fields: {} } });
  }
});

test('admin: il selettore si centra sulla casa in modifica, una sola coordinata non si salva', async ({ page }) => {
  await blockTiles(page);
  await page.goto('/admin');
  await login(page, 'admin@esempio.test');

  const insideMap = async (dialog) => {
    const map = await dialog.locator('.house-map--picker').boundingBox();
    const pin = await dialog.locator('.leaflet-marker-icon').boundingBox();
    expect(pin.x).toBeGreaterThanOrEqual(map.x);
    expect(pin.x + pin.width).toBeLessThanOrEqual(map.x + map.width);
    expect(pin.y).toBeGreaterThanOrEqual(map.y);
    expect(pin.y + pin.height).toBeLessThanOrEqual(map.y + map.height);
  };

  // Due aperture di case diverse: ogni volta il segnaposto e' dentro la vista, non resta quella di prima.
  for (const number of [1, 5]) {
    await page.getByRole('button', { name: `Modifica casa ${number}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Modifica casa ${number}` });
    await expect(dialog.locator('.leaflet-marker-icon')).toHaveCount(1);
    await insideMap(dialog);
    if (number === 5) {
      await dialog.getByLabel('Longitudine').fill('');
      await dialog.getByRole('button', { name: 'Salva' }).click();
      await expect(dialog.getByRole('alert')).toContainText('Posizione incompleta');
      await expect(dialog).toBeVisible();
      // Modificando il modulo l'avviso sparisce, senza aspettare un nuovo Salva.
      await dialog.getByLabel('Longitudine').fill('11.5');
      await expect(dialog.getByRole('alert')).toHaveCount(0);
    }
    await dialog.getByRole('button', { name: 'Annulla' }).click();
    await expect(dialog).toBeHidden();
  }
});

test('carico: le case si leggono una volta per sessione (Home, Mappa, Voto, Mappa)', async ({ page, request }) => {
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/houses/2026_3?updateMask.fieldPaths=title';
  // "Bearer owner" salta le regole, solo sull'emulatore.
  const setTitle = (title) =>
    request.patch(url, { headers: { Authorization: 'Bearer owner' }, data: { fields: { title: { stringValue: title } } } });
  const house3 = (title) => page.getByRole('button', { name: new RegExp(`Casa 3, ${title}`) });

  await blockTiles(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Mappa', exact: true }).click();
  await expect(house3('La Cripta del Fornaio')).toBeVisible();

  try {
    // Cambio una casa mentre la sessione e' aperta: con una lettura sola la mappa non lo vede.
    expect((await setTitle('Titolo cambiato')).ok()).toBe(true);
    await page.goBack();
    await page.getByRole('link', { name: 'Vota le case' }).click();
    await expect(page).toHaveURL(/\/vote$/);
    await page.goBack();
    await page.getByRole('link', { name: 'Mappa', exact: true }).click();
    await expect(house3('La Cripta del Fornaio')).toBeVisible();

    // Un ricarico e' una nuova sessione: rilegge.
    await page.reload();
    await expect(house3('Titolo cambiato')).toBeVisible();
  } finally {
    await setTitle('La Cripta del Fornaio');
  }
});

test('votazioni chiuse: il tag rosso e centrato, su una riga, e la pagina resta in una schermata', async ({ page, request }) => {
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/config/app?updateMask.fieldPaths=votingOpen';
  // "Bearer owner" salta le regole, solo sull'emulatore.
  const setOpen = (open) =>
    request.patch(url, { headers: { Authorization: 'Bearer owner' }, data: { fields: { votingOpen: { booleanValue: open } } } });
  try {
    await setOpen(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vote');
    const tag = page.locator('.tag--closed');
    await expect(tag).toHaveText('Votazioni chiuse', { timeout: 15_000 });
    const box = await tag.boundingBox();
    expect(Math.abs(box.x + box.width / 2 - 390 / 2)).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThan(40);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    await page.screenshot({ path: 'test-results/vota-chiuse-390x844.png' });
  } finally {
    await setOpen(true);
  }
});

test('regole: un voto fuori scala viene rifiutato', async () => {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-bagna-halloween' }, 'regole-e2e');
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9191', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8181);

  // Utente nuovo a ogni giro: un secondo voto con createdAt diverso sarebbe una modifica, rifiutata.
  const token = JSON.stringify({ sub: `furbetto-${Date.now()}`, email: 'furbetto@esempio.test', email_verified: true });
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  const vote = (score) => ({
    userId: user.uid,
    houseNumber: 3,
    score,
    edition: 2026,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const ref = doc(db, 'votes', `2026_${user.uid}_3`);

  await expect(setDoc(ref, vote(11))).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(setDoc(ref, vote(5))).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(setDoc(ref, vote(10))).resolves.toBeUndefined();
});

test('QR: /vota/1 dice quale casa si vota e dopo il login apre la scheda', async ({ page }) => {
  await page.goto('/vota/1');
  await expect(page.getByText('Stai per votare la casa 1 · La Casa delle Zucche')).toBeVisible();
  await login(page, 'votante@esempio.test');
  await expect(page.getByRole('dialog', { name: 'Casa 1' })).toBeVisible();
  await expect(page).toHaveURL(/\/vota\/1$/);
});

test('QR: chi ha gia votato la casa ritrova il suo voto riaprendo /vota/1 e /vote?casa=1', async ({ page }) => {
  await page.goto('/vote');
  await login(page, 'votante@esempio.test');
  await page.getByLabel('Inserisci numero casa').fill('1');
  await page.getByRole('button', { name: 'Cerca' }).click();
  const dialog = page.getByRole('dialog', { name: 'Casa 1' });
  // Come sopra: se il seed ha gia 7, toccarlo lo toglierebbe.
  const seven = dialog.getByRole('radio', { name: '7 su 10' });
  const score = (await seven.getAttribute('aria-checked')) === 'true' ? 8 : 7;
  await dialog.getByRole('radio', { name: `${score} su 10` }).click();
  await dialog.getByRole('button', { name: 'Salva voto' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Voto salvato' })).toContainText(`casa 1, ${score} su 10`);

  for (const url of ['/vota/1', '/vote?casa=1']) {
    await page.goto(url);
    const reopened = page.getByRole('dialog', { name: 'Casa 1' });
    await expect(reopened).toBeVisible();
    await expect(reopened.getByRole('radio', { name: `${score} su 10` })).toHaveAttribute('aria-checked', 'true');
    await expect(reopened.getByRole('button', { name: 'Salva voto' })).toBeEnabled();
  }
});

for (const numero of ['999', 'abc']) {
  test(`QR: /vota/${numero} mostra un messaggio chiaro con e senza login`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`/vota/${numero}`);
    const notice = page.getByRole('main').getByText(/non esiste in questa edizione/);
    await expect(notice).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'mappa' })).toHaveAttribute('href', '/mappa');
    await login(page, 'votante@esempio.test');
    await expect(page.getByRole('button', { name: 'Profilo: Votante di prova' })).toBeVisible();
    await expect(notice).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
