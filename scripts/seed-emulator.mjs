// Seed FINTO per gli emulatori Firebase (mai la produzione).
// Uso: dentro `firebase emulators:exec` oppure con gli emulatori avviati (npm run emulators):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9191 node scripts/seed-emulator.mjs
// Opzioni: --results  pubblica anche la classifica (per gli screenshot della mappa accesa).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

// Case inventate, posizionate sulla mappa segnaposto (x, y in % dell'immagine).
const HOUSES = [
  [1, 'La Casa delle Zucche', 'Cento zucche intagliate sul muretto e una sulla cassetta della posta.', 25, 24.4],
  [2, 'Il Maniero Stregato', 'Fumo dal cancello, scheletri che salutano e un organo che suona da solo.', 25, 40],
  [3, 'La Cripta del Fornaio', 'Il garage diventa una cripta: attenti ai biscotti a forma di dita.', 35, 50],
  [4, 'Ragnatele in Giardino', 'Un ragno gigante sulla siepe e ragnatele fino al secondo piano.', 45, 50],
  [5, 'La Strega del Canale', 'Una strega cucina nel pentolone sul balcone. Si sente il profumo.', 51.7, 40],
  [6, 'Villa Pipistrello', 'Pipistrelli di carta a centinaia e luci viola nelle finestre.', 61.7, 33.3],
  [7, 'Il Cimitero dei Nonni', 'Lapidi di polistirolo con epitaffi in dialetto romagnolo.', 71.7, 33.3],
  [8, 'La Soffitta Infestata', 'Una finestra in alto si accende e si spegne. Chi c\'e\' lassu\'?', 77.5, 43.3],
  [9, 'Il Laboratorio di Frankenstein', 'Scintille, provette e un mostro che si alza ogni dieci minuti.', 88.3, 50],
  [10, 'La Casa dei Fantasmi', 'Lenzuola che volano nel cortile e sussurri dal pozzo.', 77.5, 62.2],
  [11, 'Il Portico delle Candele', 'Duecento candele sui gradini e un gatto nero vero (si chiama Ombra).', 25, 62.2],
  [12, 'La Locanda degli Zombie', 'Zombie camerieri servono succo di mela "di palude".', 37.5, 69.4],
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

  // Due case "2025" nel vecchio formato (id = numero, senza edition): non devono comparire.
  batch.set(db.doc('houses/1'), { number: 1, title: 'Casa 2025 (vecchia)', description: '', visible: true });
  batch.set(db.doc('houses/2'), { number: 2, title: 'Casa 2025 (vecchia)', description: '', visible: true });

  for (const [number, title, description, x, y] of HOUSES) {
    batch.set(db.doc(`houses/${EDITION}_${number}`), {
      number, title, description, x, y, edition: EDITION, visible: true,
    });
  }

  // Voti di 40 persone finte tra le 18:00 e le 22:30 del 31/10.
  const start = new Date('2026-10-31T18:00:00+01:00').getTime();
  const totals = new Map();
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
      const entry = totals.get(number) ?? { sum: 0, count: 0 };
      totals.set(number, { sum: entry.sum + score, count: entry.count + 1 });
    }
  }

  const ranking = [...totals.entries()]
    .sort(([na, a], [nb, b]) => b.sum / b.count - a.sum / a.count || b.count - a.count || na - nb)
    .map(([number]) => number);
  batch.set(db.doc('config/results'), { edition: EDITION, published: results, ranking: results ? ranking : [] });
  await batch.commit();
}

await seedAuth();
await seedFirestore({ results: process.argv.includes('--results') });
console.log(`[seed] emulatore pronto: ${HOUSES.length} case ${EDITION}, admin ${TEST_USERS.admin.email}`);
