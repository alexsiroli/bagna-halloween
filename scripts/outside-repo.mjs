// Esce con errore se `path` (risolto in assoluto, anche via ../) sta dentro il repo.
// shortcut: non segue i symlink, da rivedere se la cartella privata diventa un link dentro il repo.
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));

export function requireOutsideRepo(path, label) {
  const rel = relative(repo, resolve(path));
  const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outside) {
    console.error(`${label} sta dentro il repo (${resolve(path)}): usa una cartella fuori, es. /Volumes/Dev/privati/bagna-halloween/`);
    process.exit(1);
  }
}
