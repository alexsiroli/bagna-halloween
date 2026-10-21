// Gestione della cartella dei dati privati senza nominarla nei comandi (vedi private-dir.mjs):
//   node scripts/private.mjs import-key <file>    sposta la chiave del service account nella cartella (600)
//   node scripts/private.mjs import-rules <file>  sposta le regole pubblicate oggi (piano di ritorno, 600)
//   node scripts/private.mjs clean                cancella export, regole e chiave, poi rimuove la cartella
// Stampa solo nomi e conteggi, mai il contenuto dei file.
import { chmod, copyFile, lstat, readdir, rename, rm, rmdir, unlink } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { ensurePrivateDir, KEY_FILE, privateDir, RULES_FILE } from './private-dir.mjs';
import { requireOutsideRepo } from './outside-repo.mjs';

const TARGETS = { 'import-key': KEY_FILE, 'import-rules': RULES_FILE };
const [command, source] = process.argv.slice(2);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

// Sposta (rename; se il disco e' diverso copia e poi cancella l'originale).
async function move(from, to) {
  try {
    await rename(from, to);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await copyFile(from, to);
    await unlink(from);
  }
}

if (command in TARGETS) {
  if (!source) fail(`Uso: node scripts/private.mjs ${command} <percorso del file>`);
  const from = resolve(source);
  requireOutsideRepo(from, 'il file');
  // lstat: un symlink non e' un file, spostarlo lascerebbe l'originale al suo posto.
  const info = await lstat(from).catch(() => null);
  if (!info?.isFile()) fail(`${from} non esiste o non e' un file (i symlink non sono ammessi).`);
  const dir = await ensurePrivateDir();
  const to = join(dir, TARGETS[command]);
  await move(from, to);
  await chmod(to, 0o600);
  console.log(`[${command}] ${basename(from)} spostato come ${TARGETS[command]} (${info.size} byte, permessi 600); l'originale non esiste piu'.`);
} else if (command === 'clean') {
  const dir = privateDir();
  const names = await readdir(dir).catch((error) => (error.code === 'ENOENT' ? null : fail(`Cartella non leggibile: ${error.code}`)));
  if (names === null) {
    console.log('[clean] niente da cancellare: la cartella non esiste.');
  } else {
    for (const name of names) await rm(join(dir, name), { recursive: true, force: true });
    await rmdir(dir);
    console.log(`[clean] cancellati ${names.length} file e rimossa la cartella.`);
  }
} else {
  fail('Uso: node scripts/private.mjs import-key <file> | import-rules <file> | clean');
}
