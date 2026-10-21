// Cartella dei dati privati (export con i votanti, regole salvate, chiave del service account).
// Sta in home, fuori dal repo: os.homedir()/Privati/bagna-halloween. Cartella 700, file 600.
// Gli agenti non la nominano mai nei comandi: gli script la usano di default e non stampano contenuti.
import { chmod, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const privateDir = () => join(homedir(), 'Privati', 'bagna-halloween');
export const KEY_FILE = 'service-account.json'; // nome fisso: i divieti di lettura degli agenti coprono *service-account*.json
export const RULES_FILE = 'regole-pubblicate.rules';
export const exportFile = (edition) => `edizione-${edition}.json`;

export async function ensurePrivateDir() {
  const dir = privateDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700); // mkdir non cambia i permessi di una cartella gia' esistente
  return dir;
}
