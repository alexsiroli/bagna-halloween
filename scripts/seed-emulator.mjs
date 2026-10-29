// Seed FINTO per gli emulatori Firebase (mai la produzione).
// Uso: dentro `firebase emulators:exec` oppure con gli emulatori avviati (npm run emulators):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9191 node scripts/seed-emulator.mjs
// Opzioni: --results  pubblica anche la top 3 2026 in results/2026 (per la mappa con i badge e per /albo).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { topThree } from '../src/podium.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Rifiuto: FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST devono puntare agli emulatori.');
  process.exit(1);
}

const PROJECT_ID = 'demo-bagna-halloween';
const EDITION = 2026;
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();
const auth = getAuth();

const TEST_USERS = {
  admin: { uid: 'admin-test', email: 'admin@esempio.test', displayName: 'Admin di prova' },
  voter: { uid: 'votante-test', email: 'votante@esempio.test', displayName: 'Votante di prova' },
  curious: { uid: 'curioso-test', email: 'curioso@esempio.test', displayName: 'Curioso di prova' },
};

// Case inventate: via, civico, posizione (lat, lng) e tipo (vuoto = non indicato). Le ultime due sono senza posizione (null).
const HOUSES = [
  [1, 'La Casa delle Zucche', 'Cento zucche intagliate sul muretto e una sulla cassetta della posta.', 'Via Cesenatico', '12', 44.2005, 12.338, 'spettacolo'],
  [2, 'Il Maniero Stregato', 'Fumo dal cancello, scheletri che salutano e un organo che suona da solo.', 'Via Cesenatico', '48/A', 44.2012, 12.3402, 'addobbi'],
  [3, 'La Cripta del Fornaio', 'Il garage diventa una cripta: attenti ai biscotti a forma di dita.', 'Via Canale', '7', 44.2, 12.3425, 'spettacolo'],
  [4, 'Ragnatele in Giardino', 'Un ragno gigante sulla siepe e ragnatele fino al secondo piano.', 'Via Canale', '21', 44.1991, 12.3441, 'addobbi'],
  [5, 'La Strega del Canale', 'Una strega cucina nel pentolone sul balcone. Si sente il profumo.', 'Via Cesenatico', '103', 44.1983, 12.336, ''],
  [6, 'Villa Pipistrello', 'Pipistrelli di carta a centinaia e luci viola nelle finestre.', 'Via del Mare', '5', 44.1975, 12.3385, 'addobbi'],
  [7, 'Il Cimitero dei Nonni', 'Lapidi di polistirolo con epitaffi in dialetto romagnolo.', 'Via del Mare', '18', 44.1969, 12.341, ''],
  [8, 'La Soffitta Infestata', 'Una finestra in alto si accende e si spegne. Chi c\'e\' lassu\'?', 'Via del Mare', '32', 44.1962, 12.3436, 'spettacolo'],
  [9, 'Il Laboratorio di Frankenstein', 'Scintille, provette e un mostro che si alza ogni dieci minuti.', 'Via dei Pini', '2', 44.199, 12.334, 'spettacolo'],
  [10, 'La Casa dei Fantasmi', 'Lenzuola che volano nel cortile e sussurri dal pozzo.', 'Via dei Pini', '9', 44.201, 12.335, ''],
  [11, 'Il Portico delle Candele', 'Duecento candele sui gradini e un gatto nero vero (si chiama Ombra).', 'Via Cesenatico', '150', null, null, 'addobbi'],
  [12, 'La Locanda degli Zombie', 'Zombie camerieri servono succo di mela "di palude".', 'Via Canale', '40', null, null, ''],
];

// Generatore deterministico: stessi voti a ogni seed.
let state = 42;
const rand = () => {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
};

async function seedAuth() {
  for (const user of Object.values(TEST_USERS)) {
    await auth.deleteUser(user.uid).catch(() => {});
  }
  // Utenti con provider google.com, cosi' compaiono nel popup dell'emulatore.
  const result = await auth.importUsers(
    Object.values(TEST_USERS).map((user) => ({
      ...user,
      emailVerified: true,
      providerData: [{ uid: `google-${user.uid}`, email: user.email, displayName: user.displayName, providerId: 'google.com' }],
    })),
  );
  if (result.failureCount) throw new Error(JSON.stringify(result.errors));
}

async function seedFirestore({ results }) {
  const batch = db.batch();
  batch.set(db.doc('config/app'), { votingOpen: true, edition: EDITION });
  batch.set(db.doc('config/admins'), { emails: [TEST_USERS.admin.email] });

  // Edizione 2025 nel formato vero: case con id = numero ed `edition: 2025`, voti `<uid>_<numero>` SENZA `edition`, con userName.
  // Top 3 attesa (a mano): casa 1 (9,3 su 3 voti), casa 3 (8,0 su 3 voti), casa 2 (8,0 su 2 voti); la 4 resta fuori.
  for (const [number, title] of [[1, 'Casa Zucca 2025'], [2, 'Il Castello 2025'], [3, 'La Soffitta 2025'], [4, 'Il Giardino 2025']]) {
    batch.set(db.doc(`houses/${number}`), { number, title, description: '', edition: 2025, visible: true });
  }
  const at2025 = Timestamp.fromDate(new Date('2025-10-31T20:00:00+01:00'));
  for (const [uid, number, score] of [
    ['anna', 1, 10], ['bruno', 1, 9], ['carla', 1, 9],
    ['anna', 2, 8], ['bruno', 2, 8],
    ['carla', 3, 8], ['dario', 3, 8], ['elisa', 3, 8],
    ['dario', 4, 7], ['elisa', 4, 6],
  ]) {
    batch.set(db.doc(`votes/${uid}_${number}`), {
      userId: uid, userName: `Votante ${uid}`, houseNumber: number, score, createdAt: at2025, updatedAt: at2025,
    });
  }
  batch.delete(db.doc('results/2025'));

  for (const [number, title, description, street, civic, lat, lng, kind] of HOUSES) {
    batch.set(db.doc(`houses/${EDITION}_${number}`), {
      number, title, description, street, civic, edition: EDITION, visible: true,
      ...(kind ? { kind } : {}),
      ...(lat === null ? {} : { lat, lng }),
    });
  }

  // Voti di 40 persone finte tra le 18:00 e le 22:30 del 31/10.
  const start = new Date('2026-10-31T18:00:00+01:00').getTime();
  const votes = [];
  for (let person = 1; person <= 40; person += 1) {
    const uid = `finto-${person}`;
    for (const [number] of HOUSES) {
      if (rand() < 0.45) continue;
      const bias = number % 4 === 0 ? 2 : number % 3 === 0 ? 1 : 0;
      const score = Math.min(10, 6 + Math.floor(rand() * 3) + (rand() < 0.5 ? bias : 0));
      const createdAt = Timestamp.fromMillis(start + Math.floor(rand() * rand() * 270) * 60_000 + person * 1000);
      batch.set(db.doc(`votes/${EDITION}_${uid}_${number}`), {
        userId: uid, houseNumber: number, score,
        edition: EDITION, createdAt, updatedAt: createdAt,
      });
      votes.push({ houseNumber: number, score });
    }
  }

  // Con --results la top 3 2026 e' gia' pubblicata (stesso calcolo dell'admin).
  const resultsRef = db.doc(`results/${EDITION}`);
  if (results) {
    const top3 = topThree(HOUSES.map(([number, title]) => ({ number, title })), votes);
    batch.set(resultsRef, { edition: EDITION, top3, updatedAt: Timestamp.now() });
  } else {
    batch.delete(resultsRef);
  }
  await batch.commit();
}

await seedAuth();
await seedFirestore({ results: process.argv.includes('--results') });
console.log(`[seed] emulatore pronto: ${HOUSES.length} case ${EDITION}, admin ${TEST_USERS.admin.email}`);
