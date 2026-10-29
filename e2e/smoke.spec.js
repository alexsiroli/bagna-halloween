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
  await expect(page.getByText('votazioni aperte')).toBeVisible();
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

test('mappa: segnaposto, scheda con Vota, case senza posizione in elenco', async ({ page }) => {
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
  // Senza login la scheda invita ad accedere (niente zucche), senza cambiare pagina.
  await expect(dialog.getByRole('button', { name: 'Accedi con Google per votare' })).toBeVisible();
  await expect(dialog.getByRole('radio')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Chiudi' }).click();
  await expect(dialog).toBeHidden();

  // Le due case senza lat/lng non hanno segnaposto ma si votano dall'elenco.
  await expect(page.getByRole('link', { name: 'Vota la casa 11' })).toHaveAttribute('href', '/vota/11');
  await expect(page.getByRole('link', { name: 'Vota la casa 12' })).toHaveAttribute('href', '/vota/12');
  expect(errors).toEqual([]);

  // Senza file dei punti (qui il server risponde con l'HTML dell'app) restano solo le case e la legenda dei loro tipi.
  await expect(page.getByRole('button', { name: /^Bar:/ })).toHaveCount(0);
  await expect(page.locator('.map-legend')).toContainText('Casa addobbata');
  await expect(page.locator('.map-legend')).not.toContainText('Bar');

  // Senza login nessun segnaposto ha uno stato di voto e il filtro non c'e'.
  await expect(page.locator('.pin[data-voted]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Da votare', exact: true })).toHaveCount(0);

  // Dall'elenco «Altre case» il link porta alla pagina di voto della casa (rotta /vota/:numero), non a una 404.
  await page.getByRole('link', { name: 'Vota la casa 11' }).click();
  await expect(page).toHaveURL(/\/vota\/11$/);
  await expect(page.getByText('Stai per votare la casa 11 · Il Portico delle Candele')).toBeVisible();
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
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(1);
  await expect(page.locator('.leaflet-overlay-pane path.leaflet-interactive')).toHaveCount(0);
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCSS('stroke', 'rgb(217, 83, 58)'); // --strada-chiusa
  // Il tipo e' nel nome accessibile e nel glifo del segnaposto.
  const show = page.getByRole('button', { name: 'Casa 3, La Cripta del Fornaio, spettacolo: apri la scheda' });
  const decor = page.getByRole('button', { name: 'Casa 4, Ragnatele in Giardino, casa addobbata: apri la scheda' });
  await expect(show.locator('svg')).toHaveCount(1);
  await expect(decor.locator('svg')).toHaveCount(1);
  expect(await show.innerHTML()).not.toBe(await decor.innerHTML());
  await expect(page.getByRole('button', { name: /^Casa 5, La Strega del Canale: apri/ }).locator('svg')).toHaveCount(0);

  // Legenda in testo, solo i tipi presenti, con la nota del file.
  const legend = page.locator('.map-legend');
  for (const label of ['Spettacolo', 'Casa addobbata', 'Bar', 'Food truck', 'Servizi igienici', 'Parcheggio', 'Intrattenimento', 'Strada chiusa']) {
    await expect(legend.getByRole('listitem').filter({ hasText: label })).toHaveCount(1);
  }
  await expect(legend).toContainText('dalle 18:30 alle 23:00');

  // Un tocco su un punto: nome e indirizzo (come testo), niente Vota.
  await page.getByRole('button', { name: 'Bar: Bar <b>DJ</b> set' }).click();
  const popup = page.locator('.leaflet-popup');
  await expect(popup).toContainText('Bar <b>DJ</b> set');
  await expect(popup).toContainText('Via di Prova 9');
  await expect(popup.locator('b')).toHaveCount(0);
  await expect(popup.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Si chiude anche da tastiera: il bottone ha un nome accessibile.
  await popup.getByRole('button', { name: 'Chiudi' }).focus();
  await page.keyboard.press('Enter');
  await expect(popup).toHaveCount(0);

  // Elenco degli spettacoli: case con Vota, punti di intrattenimento senza.
  const shows = page.locator('section', { has: page.getByRole('heading', { name: 'Spettacoli' }) });
  await expect(shows.getByRole('link', { name: /^Vota la casa/ })).toHaveCount(4);
  await expect(shows.getByRole('link', { name: 'Vota la casa 3' })).toHaveAttribute('href', '/vota/3');
  await expect(shows.getByRole('listitem').filter({ hasText: 'Trampolieri di prova' })).toContainText('Via Balitrona 22/C');
  await expect(shows.getByRole('listitem').filter({ hasText: 'Trampolieri di prova' }).getByRole('link')).toHaveCount(0);

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

test('voto: login emulatore, zucche, voto salvato', async ({ page }) => {
  await page.goto('/vote');
  await login(page, 'votante@esempio.test');
  await expect(page.getByText('Votante di prova')).toBeVisible();

  await page.getByLabel('Numero della casa').fill('3');
  await page.getByRole('button', { name: 'Cerca' }).click();
  const dialog = page.getByRole('dialog', { name: 'Casa 3' });
  await expect(dialog).toBeVisible();

  // Se il test gira due volte sullo stesso seed, 8 e' gia' scelto: toccarlo di nuovo lo toglierebbe.
  const eight = dialog.getByRole('radio', { name: '8 su 10' });
  const score = (await eight.getAttribute('aria-checked')) === 'true' ? 9 : 8;
  await dialog.getByRole('radio', { name: `${score} su 10` }).click();
  await dialog.getByRole('button', { name: 'Salva voto' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Voto salvato' })).toContainText(`casa 3, ${score} su 10`);
  await expect(page.getByRole('button', { name: /Casa 3/ })).toContainText(String(score));
});

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
    // L'admin e' ancora dentro: l'etichetta porta anche lo stato di voto.
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

// Voti di un utente di prova scritti e tolti dall'emulatore (REST, "Bearer owner" salta le regole: solo emulatore).
const FIRESTORE = 'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents';
const OWNER = { Authorization: 'Bearer owner' };
const CURIOSO = 'curioso-test';
const HOUSES_TOTAL = 12;
const resetVotes = async (request) => {
  for (let number = 1; number <= HOUSES_TOTAL; number += 1) await request.delete(`${FIRESTORE}/votes/2026_${CURIOSO}_${number}`, { headers: OWNER });
};
const seedVote = (request, number, score) => {
  const now = { timestampValue: new Date().toISOString() };
  return request.patch(`${FIRESTORE}/votes/2026_${CURIOSO}_${number}`, {
    headers: OWNER,
    data: { fields: { userId: { stringValue: CURIOSO }, houseNumber: { integerValue: String(number) }, score: { integerValue: String(score) }, edition: { integerValue: '2026' }, createdAt: now, updatedAt: now } },
  });
};
const setVotingOpen = (request, open) =>
  request.patch(`${FIRESTORE}/config/app?updateMask.fieldPaths=votingOpen`, { headers: OWNER, data: { fields: { votingOpen: { booleanValue: open } } } });
// Mappa senza tessere e senza file dei punti: restano le 10 case con posizione.
const openMap = async (page) => {
  await blockTiles(page);
  await page.route('**/punti/*.json', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>x</title>' }));
  await page.goto('/mappa');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(10);
};

test('percorso: da /vota/3, dopo il login, Mappa e I miei voti si raggiungono senza scorrere e senza nuovo login (375x667)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await blockTiles(page);
  // Senza login: «Mappa» e' gia' visibile senza scorrere.
  for (const url of ['/vota/3', '/vote']) {
    await page.goto(url);
    await expect(page.getByRole('link', { name: 'Mappa', exact: true })).toBeInViewport({ ratio: 1 });
  }
  await page.goto('/vota/3');
  await login(page, 'curioso@esempio.test');
  // Dopo il login da QR la scheda della casa 3 si apre da sola: si chiude, poi «Mappa» e' a un tocco.
  await page.getByRole('dialog', { name: 'Casa 3' }).getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByText('Curioso di prova')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mappa', exact: true })).toBeInViewport({ ratio: 1 });

  await page.getByRole('link', { name: 'Mappa', exact: true }).click();
  await expect(page).toHaveURL(/\/mappa$/);
  await expect(page.getByRole('link', { name: 'I miei voti', exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole('link', { name: 'I miei voti', exact: true }).click();
  await expect(page).toHaveURL(/\/vote$/);
  await expect(page.getByText('Curioso di prova')).toBeVisible(); // ancora dentro
});

test('mappa: stato dei segnaposto, filtro «Da votare» di partenza, avanzamento e logout', async ({ page, request }) => {
  await resetVotes(request);
  try {
    await seedVote(request, 2, 8);
    await seedVote(request, 5, 6);
    await openMap(page);

    // Il login si fa dalla scheda: resta aperta sulla stessa casa, ora con le zucche.
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    const sheet = page.getByRole('dialog', { name: 'Casa 7' });
    await login(page, 'curioso@esempio.test');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('radio', { name: '8 su 10' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Annulla' }).click();

    // D3: dopo il login parte «Da votare»: 8 segnaposto su 10, nessuno votato. Punti e strade restano (qui non ce ne sono).
    await expect(page.getByRole('button', { name: 'Da votare', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(8);
    await expect(page.locator('.pin[data-voted="true"]')).toHaveCount(0);
    await expect(page.locator('.pin[data-voted="false"]')).toHaveCount(8);
    await expect(page.getByRole('button', { name: /^Casa 7, .*, da votare: apri/ })).toBeVisible();
    await expect(page.locator('.map-progress')).toHaveText('2 su 12 votate');

    await page.getByRole('button', { name: 'Votate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Votate', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Da votare', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
    await expect(page.locator('.pin[data-voted="true"]')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Casa 2, .*, votata 8 su 10: apri/ })).toContainText('8');
    await expect(page.getByRole('button', { name: /^Casa 5, .*, votata 6 su 10: apri/ })).toBeVisible();

    await page.getByRole('button', { name: 'Tutte', exact: true }).click();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(10);
    await expect(page.locator('.pin[data-voted="true"]')).toHaveCount(2);

    // Dopo il logout gli stati spariscono.
    await page.getByRole('link', { name: 'I miei voti', exact: true }).click();
    await page.getByRole('button', { name: 'Esci' }).click();
    await page.getByRole('link', { name: 'Mappa', exact: true }).click();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(10);
    await expect(page.locator('.pin[data-voted]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Casa 2, .*votata/ })).toHaveCount(0);
    await expect(page.locator('.map-filter')).toHaveCount(0);
  } finally {
    await resetVotes(request);
  }
});

test('mappa: voto dalla scheda senza lasciare la mappa, con «Da votare» il segnaposto sparisce, anche /vote si aggiorna', async ({ page, request }) => {
  await resetVotes(request);
  try {
    await openMap(page);
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    await login(page, 'curioso@esempio.test');
    await page.getByRole('dialog', { name: 'Casa 7' }).getByRole('button', { name: 'Annulla' }).click();
    await expect(page.locator('.map-progress')).toHaveText('0 su 12 votate');

    // Posizione dei segnaposto nella mappa prima del voto: stessa vista = stesse posizioni (la mappa puo' spostarsi nella pagina).
    const placeOf = async (number) => {
      const map = await page.locator('.house-map').boundingBox();
      const pin = await page.getByRole('button', { name: new RegExp(`^Casa ${number}, `) }).boundingBox();
      return [Math.round(pin.x - map.x), Math.round(pin.y - map.y)];
    };
    const before = [await placeOf(1), await placeOf(10)];

    await page.getByRole('button', { name: /^Casa 7, / }).click();
    const sheet = page.getByRole('dialog', { name: 'Casa 7' });
    await expect(sheet).toContainText('Via del Mare 18');
    await expect(sheet).toContainText('Lapidi di polistirolo');
    await sheet.getByRole('radio', { name: '9 su 10' }).click();
    await sheet.getByRole('button', { name: 'Salva voto' }).click();

    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/mappa$/);
    await expect(page.getByRole('status').filter({ hasText: 'Voto salvato' })).toContainText('casa 7, 9 su 10');
    await expect(page.locator('.map-progress')).toHaveText('1 su 12 votate');
    // Filtro «Da votare» ancora attivo: il segnaposto 7 non c'e' piu'; vista invariata (nessun reinquadramento).
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(9);
    await expect(page.getByRole('button', { name: /^Casa 7, / })).toHaveCount(0);
    expect([await placeOf(1), await placeOf(10)]).toEqual(before);

    await page.getByRole('button', { name: 'Tutte', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Casa 7, .*, votata 9 su 10: apri/ })).toContainText('9');

    // /vote: stesso voto e stesso conteggio, senza ricaricare e senza nuovo login.
    await page.getByRole('link', { name: 'I miei voti', exact: true }).click();
    await expect(page.getByRole('button', { name: /Casa 7/ })).toContainText('9');
    await expect(page.locator('.vote-progress')).toContainText('1 su 12');
  } finally {
    await resetVotes(request);
  }
});

test('mappa: «Cancella voto» chiede conferma, poi il segnaposto torna da votare e il contatore scende', async ({ page, request }) => {
  await resetVotes(request);
  try {
    await seedVote(request, 2, 8);
    await seedVote(request, 5, 6);
    await openMap(page);
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    await login(page, 'curioso@esempio.test');
    const sheet = page.getByRole('dialog', { name: 'Casa 7' });
    // Casa non votata: niente «Cancella voto».
    await expect(sheet.getByRole('button', { name: 'Cancella voto' })).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Annulla' }).click();
    await expect(page.locator('.map-progress')).toHaveText('2 su 12 votate');

    await page.getByRole('button', { name: 'Votate', exact: true }).click();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
    await page.getByRole('button', { name: /^Casa 2, .*votata 8 su 10/ }).click();
    const voted = page.getByRole('dialog', { name: 'Casa 2', exact: true }); // exact: la conferma dice «…per la casa 2?»
    await voted.getByRole('button', { name: 'Cancella voto' }).click();

    // Conferma: «Annulla» lascia il voto, «Cancella» lo toglie.
    const confirm = page.getByRole('dialog', { name: 'Vuoi cancellare il tuo voto per la casa 2?' });
    await confirm.getByRole('button', { name: 'Annulla' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.locator('.map-progress')).toHaveText('2 su 12 votate');
    await voted.getByRole('button', { name: 'Cancella voto' }).click();
    await confirm.getByRole('button', { name: 'Cancella', exact: true }).click();

    await expect(voted).toBeHidden();
    await expect(page).toHaveURL(/\/mappa$/);
    await expect(page.getByRole('status').filter({ hasText: 'Voto cancellato' })).toContainText('casa 2');
    await expect(page.locator('.map-progress')).toHaveText('1 su 12 votate');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    await page.getByRole('button', { name: 'Tutte', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Casa 2, .*, da votare: apri/ })).toBeVisible();

    // /vote: stesso stato, senza nuovo login.
    await page.getByRole('link', { name: 'I miei voti', exact: true }).click();
    await expect(page.locator('.vote-progress')).toContainText('1 su 12');
  } finally {
    await resetVotes(request);
  }
});

test('mappa: con le votazioni chiuse la scheda non permette di votare', async ({ page, request }) => {
  await resetVotes(request);
  try {
    await openMap(page);
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    await login(page, 'curioso@esempio.test');
    await page.getByRole('dialog', { name: 'Casa 7' }).getByRole('button', { name: 'Annulla' }).click();
    expect((await setVotingOpen(request, false)).ok()).toBe(true);
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    const sheet = page.getByRole('dialog', { name: 'Casa 7' });
    await expect(sheet).toContainText('Le votazioni sono chiuse');
    await expect(sheet.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    await expect(sheet.getByRole('button', { name: 'Salva voto' })).toBeDisabled();
  } finally {
    await setVotingOpen(request, true);
    await resetVotes(request);
  }
});

test('mappa: con tutte le case votate «Da votare» mostra il messaggio, «Votate» senza voti pure', async ({ page, request }) => {
  await resetVotes(request);
  try {
    for (let number = 1; number <= HOUSES_TOTAL; number += 1) await seedVote(request, number, 7);
    await openMap(page);
    await page.getByRole('button', { name: /^Casa 7, / }).click();
    await login(page, 'curioso@esempio.test');
    await page.getByRole('dialog', { name: 'Casa 7' }).getByRole('button', { name: 'Annulla' }).click();
    await expect(page.locator('.map-progress')).toHaveText('12 su 12 votate');
    await expect(page.getByRole('main').getByText('Hai votato tutte le case!')).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
    await resetVotes(request);
    await expect(page.getByRole('main').getByText('Hai votato tutte le case!')).toBeHidden();
    await page.getByRole('button', { name: 'Votate', exact: true }).click();
    await expect(page.getByRole('main').getByText('Nessuna casa votata ancora.')).toBeVisible();
  } finally {
    await resetVotes(request);
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
  await page.getByRole('link', { name: /Mappa del quartiere/ }).click();
  await expect(house3('La Cripta del Fornaio')).toBeVisible();

  try {
    // Cambio una casa mentre la sessione e' aperta: con una lettura sola la mappa non lo vede.
    expect((await setTitle('Titolo cambiato')).ok()).toBe(true);
    await page.goBack();
    await page.getByRole('link', { name: 'Vota le case' }).click();
    await expect(page).toHaveURL(/\/vote$/);
    await page.goBack();
    await page.getByRole('link', { name: /Mappa del quartiere/ }).click();
    await expect(house3('La Cripta del Fornaio')).toBeVisible();

    // Un ricarico e' una nuova sessione: rilegge.
    await page.reload();
    await expect(house3('Titolo cambiato')).toBeVisible();

    // Contatori di sola lettura dell'emulatore (window.__reads): /vote -> /mappa -> /vote non rilegge le case
    // e non apre un secondo ascolto sui voti.
    await page.goto('/vote');
    await login(page, 'curioso@esempio.test');
    await expect(page.getByText('Curioso di prova')).toBeVisible();
    await page.getByRole('link', { name: 'Mappa', exact: true }).click();
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
    await page.getByRole('link', { name: 'I miei voti', exact: true }).click();
    await expect(page.getByText('Curioso di prova')).toBeVisible();
    expect(await page.evaluate(() => window.__reads)).toEqual({ houses: 1, votes: 1 });
  } finally {
    await setTitle('La Cripta del Fornaio');
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
  await page.getByLabel('Numero della casa').fill('1');
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
    await expect(page.getByRole('main').getByRole('link', { name: 'mappa', exact: true })).toHaveAttribute('href', '/mappa');
    await login(page, 'votante@esempio.test');
    await expect(page.getByText('Votante di prova')).toBeVisible();
    await expect(notice).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
