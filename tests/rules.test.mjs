// Test delle regole Firestore sull'emulatore: npm run test:rules
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const EDITION = 2026;
let env;

// Come Vote.jsx: createdAt e updatedAt sono serverTimestamp().
const vote = (uid, houseNumber, score, extra = {}) => ({
  userId: uid,
  houseNumber,
  score,
  edition: EDITION,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const as = (uid, email) =>
  env.authenticatedContext(uid, email ? { email, email_verified: true } : {}).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bagna-halloween',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config/app'), { votingOpen: true, edition: EDITION });
    await setDoc(doc(db, 'config/admins'), { emails: ['admin@esempio.test'] });
    await setDoc(doc(db, 'houses/2026_1'), { number: 1, edition: EDITION, visible: true });
    await setDoc(doc(db, 'votes/2026_bob_1'), vote('bob', 1, 7));
  });
});

test('chiunque legge case e config/app, nessuno tranne gli admin legge config/admins', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anon, 'houses/2026_1')));
  await assertSucceeds(getDoc(doc(anon, 'config/app')));
  await assertFails(getDoc(doc(anon, 'config/admins')));
  await assertFails(getDoc(doc(as('eve', 'eve@esempio.test'), 'config/admins')));
  await assertSucceeds(getDoc(doc(as('ada', 'admin@esempio.test'), 'config/admins')));
});

test('case e config scrivibili solo dagli admin', async () => {
  const eve = as('eve', 'eve@esempio.test');
  await assertFails(setDoc(doc(eve, 'houses/2026_2'), { number: 2, edition: EDITION }));
  await assertFails(setDoc(doc(eve, 'config/app'), { votingOpen: false }, { merge: true }));
  await assertFails(setDoc(doc(eve, 'config/admins'), { emails: ['eve@esempio.test'] }));

  // Email non verificata: non basta essere in lista.
  const unverified = env
    .authenticatedContext('ada', { email: 'admin@esempio.test', email_verified: false })
    .firestore();
  await assertFails(setDoc(doc(unverified, 'config/app'), { votingOpen: false }, { merge: true }));

  const ada = as('ada', 'admin@esempio.test');
  await assertSucceeds(setDoc(doc(ada, 'houses/2026_2'), { number: 2, edition: EDITION }));
  await assertSucceeds(setDoc(doc(ada, 'config/app'), { votingOpen: false }, { merge: true }));
});

test('un voto valido si crea e si modifica solo se e tuo', async () => {
  const alice = as('alice');
  await assertSucceeds(setDoc(doc(alice, 'votes/2026_alice_1'), vote('alice', 1, 8)));
  await assertSucceeds(updateDoc(doc(alice, 'votes/2026_alice_1'), { score: 10, updatedAt: serverTimestamp() }));
  // Voto a nome di un altro, o con id che non corrisponde.
  await assertFails(setDoc(doc(alice, 'votes/2026_bob_1'), vote('bob', 1, 9)));
  await assertFails(setDoc(doc(alice, 'votes/2026_alice_2'), vote('alice', 1, 8)));
  await assertFails(setDoc(doc(alice, 'votes/alice_1'), vote('alice', 1, 8)));
  // Edizione sbagliata e campi extra.
  await assertFails(setDoc(doc(alice, 'votes/2025_alice_1'), vote('alice', 1, 8, { edition: 2025 })));
  await assertFails(setDoc(doc(alice, 'votes/2026_alice_1'), vote('alice', 1, 8, { admin: true })));
  // Senza login.
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'votes/2026_x_1'), vote('x', 1, 8)));
});

test('il voto non porta dati personali (userName rifiutato)', async () => {
  await assertFails(setDoc(doc(as('alice'), 'votes/2026_alice_1'), vote('alice', 1, 8, { userName: 'Alice' })));
});

test('si vota solo una casa che esiste nell edizione', async () => {
  const alice = as('alice');
  await assertFails(setDoc(doc(alice, 'votes/2026_alice_99'), vote('alice', 99, 8)));
  await assertSucceeds(setDoc(doc(alice, 'votes/2026_alice_1'), vote('alice', 1, 8)));
});

test('punteggio intero da 6 a 10', async () => {
  const alice = as('alice');
  for (const score of [5, 11, 0, 7.5, '8']) {
    await assertFails(setDoc(doc(alice, 'votes/2026_alice_1'), vote('alice', 1, score)));
  }
  await assertSucceeds(setDoc(doc(alice, 'votes/2026_alice_1'), vote('alice', 1, 6)));
  await assertSucceeds(updateDoc(doc(alice, 'votes/2026_alice_1'), { score: 10, updatedAt: serverTimestamp() }));
});

test('createdAt e updatedAt devono essere timestamp del server', async () => {
  const alice = as('alice');
  const ref = doc(alice, 'votes/2026_alice_1');
  await assertFails(setDoc(ref, vote('alice', 1, 8, { createdAt: 'x' })));
  await assertFails(setDoc(ref, vote('alice', 1, 8, { createdAt: 123 })));
  // createdAt nel futuro e updatedAt scelto dal client.
  await assertFails(setDoc(ref, vote('alice', 1, 8, { createdAt: Timestamp.fromMillis(Date.now() + 3600_000) })));
  await assertFails(setDoc(ref, vote('alice', 1, 8, { updatedAt: Timestamp.fromMillis(Date.now() - 3600_000) })));
  await assertFails(setDoc(ref, vote('alice', 1, 8, { updatedAt: 'x' })));
  // Mancanti.
  await assertFails(setDoc(ref, { userId: 'alice', houseNumber: 1, score: 8, edition: EDITION }));
  await assertSucceeds(setDoc(ref, vote('alice', 1, 8)));
});

test('aggiornando un voto createdAt resta quello originale', async () => {
  const created = Timestamp.fromMillis(Date.now() - 3600_000);
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'votes/2026_alice_1'), vote('alice', 1, 7, { createdAt: created, updatedAt: created })),
  );
  const ref = doc(as('alice'), 'votes/2026_alice_1');
  await assertFails(setDoc(ref, vote('alice', 1, 9)));
  await assertSucceeds(setDoc(ref, vote('alice', 1, 9, { createdAt: created })));
});

// Come Vote.jsx quando il voto esiste: merge senza createdAt (anche se il primo salvataggio e ancora in attesa).
test('modifica subito dopo la creazione: setDoc merge senza createdAt passa e createdAt non cambia', async () => {
  const ref = doc(as('alice'), 'votes/2026_alice_1');
  await assertSucceeds(setDoc(ref, vote('alice', 1, 7)));
  const modifica = { userId: 'alice', houseNumber: 1, score: 9, edition: EDITION, updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(ref, modifica, { merge: true }));
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'votes/2026_alice_1'));
    assert.equal(snap.data().score, 9);
    assert.ok(snap.data().createdAt instanceof Timestamp);
  });
});

test('niente voti su case nascoste', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'houses/2026_2'), { number: 2, edition: EDITION, visible: false });
    await setDoc(doc(db, 'houses/2026_3'), { number: 3, edition: EDITION });
  });
  const alice = as('alice');
  await assertFails(setDoc(doc(alice, 'votes/2026_alice_2'), vote('alice', 2, 8)));
  // Senza campo visible la casa conta come visibile.
  await assertSucceeds(setDoc(doc(alice, 'votes/2026_alice_3'), vote('alice', 3, 8)));
});

test('niente voti a votazioni chiuse', async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'config/app'), { votingOpen: false, edition: EDITION }),
  );
  await assertFails(setDoc(doc(as('alice'), 'votes/2026_alice_1'), vote('alice', 1, 8)));
});

test('i voti degli altri non si leggono, gli admin leggono tutto', async () => {
  const alice = as('alice');
  await assertFails(getDoc(doc(alice, 'votes/2026_bob_1')));
  await assertFails(getDocs(collection(alice, 'votes')));
  await assertSucceeds(
    getDocs(query(collection(alice, 'votes'), where('userId', '==', 'alice'), where('edition', '==', EDITION))),
  );
  await assertSucceeds(getDoc(doc(as('bob'), 'votes/2026_bob_1')));
  await assertSucceeds(
    getDocs(query(collection(as('ada', 'admin@esempio.test'), 'votes'), where('edition', '==', EDITION))),
  );
});

// config/admins: solo gli admin lo modificano, e mai in modo che si tolgano o spariscano.
const ADMIN = 'admin@esempio.test';
const adminsRef = (db) => doc(db, 'config/admins');

test('un admin aggiunge e toglie un altro admin', async () => {
  const ref = adminsRef(as('ada', ADMIN));
  await assertSucceeds(updateDoc(ref, { emails: [ADMIN, 'bea@esempio.test'], updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { emails: [ADMIN], updatedAt: serverTimestamp() }));
});

test('config/admins: auto-promozione, email non verificata e auto-rimozione falliscono', async () => {
  const eve = adminsRef(as('eve', 'eve@esempio.test'));
  await assertFails(updateDoc(eve, { emails: [ADMIN, 'eve@esempio.test'], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(adminsRef(as('x')), { emails: [ADMIN, 'x@esempio.test'], updatedAt: serverTimestamp() }));

  const unverified = env.authenticatedContext('ada', { email: ADMIN, email_verified: false }).firestore();
  await assertFails(updateDoc(adminsRef(unverified), { emails: [ADMIN, 'bea@esempio.test'], updatedAt: serverTimestamp() }));

  // Togliersi, anche lasciando altri admin.
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(adminsRef(ctx.firestore()), { emails: [ADMIN, 'bea@esempio.test'] }),
  );
  await assertFails(updateDoc(adminsRef(as('ada', ADMIN)), { emails: ['bea@esempio.test'], updatedAt: serverTimestamp() }));
});

test('config/admins: lista vuota, doppioni, non lista, troppi, campi extra falliscono', async () => {
  const ref = adminsRef(as('ada', ADMIN));
  const tooMany = [ADMIN, ...Array.from({ length: 50 }, (_, i) => `a${i}@esempio.test`)]; // 51
  for (const emails of [[], [ADMIN, ADMIN], [ADMIN, 'bea@esempio.test', 'bea@esempio.test'], ADMIN, { 0: ADMIN }, tooMany]) {
    await assertFails(updateDoc(ref, { emails, updatedAt: serverTimestamp() }));
  }
  await assertFails(updateDoc(ref, { emails: [ADMIN, 'bea@esempio.test'], updatedAt: serverTimestamp(), extra: 1 }));
  await assertFails(updateDoc(ref, { extra: 1 }));
});

test("config/admins: updatedAt e' l'ora del server, non scelto dal client", async () => {
  const ref = adminsRef(as('ada', ADMIN));
  const emails = [ADMIN, 'bea@esempio.test'];
  await assertFails(updateDoc(ref, { emails, updatedAt: 'ieri' }));
  await assertFails(updateDoc(ref, { emails, updatedAt: Timestamp.fromDate(new Date('2020-01-01')) }));
  await assertSucceeds(updateDoc(ref, { emails, updatedAt: serverTimestamp() }));
});

test('config/admins: create e delete mai dal client', async () => {
  const ada = as('ada', ADMIN);
  await assertFails(deleteDoc(adminsRef(ada)));
  await env.withSecurityRulesDisabled((ctx) => deleteDoc(adminsRef(ctx.firestore())));
  await assertFails(setDoc(adminsRef(ada), { emails: [ADMIN] }));
});

test('gli altri config/* restano scrivibili dagli admin e non dagli altri', async () => {
  await assertSucceeds(setDoc(doc(as('ada', ADMIN), 'config/results'), { published: false }));
  await assertSucceeds(updateDoc(doc(as('ada', ADMIN), 'config/app'), { votingOpen: false }));
  await assertFails(setDoc(doc(as('eve', 'eve@esempio.test'), 'config/results'), { published: true }));
});
