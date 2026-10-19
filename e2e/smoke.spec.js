// Smoke sugli emulatori Firebase (seed: scripts/seed-emulator.mjs). Mai la produzione.
import { expect, test } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';

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

test('carico: le case si leggono una volta per sessione (Home, Mappa, Voto, Mappa)', async ({ page, request }) => {
  const url =
    'http://127.0.0.1:8181/v1/projects/demo-bagna-halloween/databases/(default)/documents/houses/2026_3?updateMask.fieldPaths=title';
  // "Bearer owner" salta le regole, solo sull'emulatore.
  const setTitle = (title) =>
    request.patch(url, { headers: { Authorization: 'Bearer owner' }, data: { fields: { title: { stringValue: title } } } });
  const house3 = (title) => page.getByRole('link', { name: new RegExp(`Casa 3, ${title}`) });

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

  const token = JSON.stringify({ sub: 'furbetto', email: 'furbetto@esempio.test', email_verified: true });
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  const vote = (score) => ({ userId: user.uid, houseNumber: 3, score, edition: 2026 });
  const ref = doc(db, 'votes', `2026_${user.uid}_3`);

  await expect(setDoc(ref, vote(11))).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(setDoc(ref, vote(5))).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(setDoc(ref, vote(10))).resolves.toBeUndefined();
});
