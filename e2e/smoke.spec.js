// Smoke sugli emulatori Firebase (seed: scripts/seed-emulator.mjs). Mai la produzione.
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
  await expect(page.getByText(/OpenStreetMap Foundation/)).toBeVisible();
});

test('mappa: segnaposto, scheda con Vota, case senza posizione in elenco', async ({ page }) => {
  await blockTiles(page);
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
});

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
