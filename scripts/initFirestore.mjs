import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

dotenv.config();

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Check that your .env file is configured before running this script.');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function ensureConfigDocument() {
  const configRef = doc(db, 'config', 'app');
  const snapshot = await getDoc(configRef);

  if (snapshot.exists()) {
    console.log('[skip] Document config/app already exists');
    return;
  }

  await setDoc(configRef, {
    votingOpen: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log('[ok] Created config/app with votingOpen = true');
}

async function seedCollectionFromFile(collectionName, fileName, prepareDoc) {
  const filePath = path.resolve(process.cwd(), 'seeds', fileName);

  try {
    await access(filePath);
  } catch {
    console.log(`[skip] No seeds/${fileName} file found – skipping ${collectionName}`);
    return;
  }

  const raw = await readFile(filePath, 'utf8');
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (error) {
    console.error(`[error] Unable to parse ${fileName}:`, error.message);
    process.exit(1);
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.log(`[skip] seeds/${fileName} is empty – nothing to import`);
    return;
  }

  const collRef = collection(db, collectionName);
  const existingSnap = await getDocs(query(collRef, limit(1)));
  if (!existingSnap.empty) {
    console.log(`[skip] Collection ${collectionName} already has data – nothing imported`);
    return;
  }

  for (const entry of entries) {
    const { id, data } = prepareDoc(entry);
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`[ok] Imported ${collectionName}/${id}`);
  }
}

async function main() {
  await ensureConfigDocument();

  await seedCollectionFromFile('houses', 'houses.json', (entry) => {
    if (typeof entry.number !== 'number') {
      throw new Error('Each house entry must include a numeric "number" field');
    }

    return {
      id: String(entry.number),
      data: {
        number: entry.number,
        title: entry.title || '',
        description: entry.description || '',
        visible: entry.visible !== false,
      },
    };
  });

  await seedCollectionFromFile('votes', 'votes.json', (entry) => {
    if (!entry.userId || typeof entry.houseNumber !== 'number') {
      throw new Error('Each vote entry must include userId and numeric houseNumber');
    }

    const voteId = `${entry.userId}_${entry.houseNumber}`;
    return {
      id: voteId,
      data: {
        userId: entry.userId,
        houseNumber: entry.houseNumber,
        decorationVote: entry.decorationVote ?? 0,
        showVote: entry.showVote ?? 0,
      },
    };
  });
}

main()
  .then(() => {
    console.log('Firestore initialization complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to initialize Firestore:', error);
    process.exit(1);
  });
