// Esce con errore se `path` sta dentro il repo, anche scritto con ../ o passando da un symlink
// (es. /Users/alexsiroli/AlxStudio/progetti/bagna-halloween, che punta al checkout reale).
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Percorso reale della cartella, o del primo antenato esistente piu' i segmenti che mancano ancora.
const real = (path) => {
  const missing = [];
  let dir = resolve(path);
  while (!existsSync(dir)) {
    missing.unshift(basename(dir));
    dir = dirname(dir);
  }
  return join(realpathSync(dir), ...missing);
};

const repo = real(fileURLToPath(new URL('..', import.meta.url)));

export function requireOutsideRepo(path, label) {
  const target = real(path);
  const rel = relative(repo, target);
  const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outside) {
    console.error(`${label} sta dentro il repo (${target}): usa una cartella fuori dal repo (di default quella privata in home).`);
    process.exit(1);
  }
}
