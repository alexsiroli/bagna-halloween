// Smoke sugli emulatori Firebase (seed: scripts/seed-emulator.mjs). Mai la produzione.
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

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
  await expect(dialog.getByRole('link', { name: 'Vota' })).toHaveAttribute('href', '/vota/1');
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

  // «Vota» nella scheda porta alla pagina di voto della casa (rotta /vota/:numero), non a una 404.
  await page.getByRole('button', { name: /^Casa 1, La Casa delle Zucche/ }).click();
  await page.getByRole('dialog', { name: 'Casa 1' }).getByRole('link', { name: 'Vota' }).click();
  await expect(page).toHaveURL(/\/vota\/1$/);
  await expect(page.getByText('Stai per votare la casa 1 · La Casa delle Zucche')).toBeVisible();
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
    await expect(page.getByRole('button', { name: /^Casa 5, La Strega del Canale, casa addobbata: apri/ })).toBeVisible();
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
    await expect(page.getByRole('main').getByRole('link', { name: 'mappa' })).toHaveAttribute('href', '/mappa');
    await login(page, 'votante@esempio.test');
    await expect(page.getByText('Votante di prova')).toBeVisible();
    await expect(notice).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
