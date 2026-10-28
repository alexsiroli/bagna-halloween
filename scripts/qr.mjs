// QR per i cartelli A4 (uno del sito, uno per casa). SVG vettoriali: si stampano a qualsiasi dimensione.
//   node scripts/qr.mjs --numbers 1-40 --out <cartella> [--base-url https://bagna-halloween.netlify.app]
// Scrive qr-sito.svg (<base>/) e qr-casa-<numero>.svg (<base>/vota/<numero>). --numbers: intervalli e liste (1-12,15,20-22).
import qrcode from 'qrcode-generator';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BASE_URL = 'https://bagna-halloween.netlify.app';
const MAX_NUMBER = 9999; // evita intervalli enormi per errore di battitura
const QUIET_ZONE = 4; // moduli di margine bianco intorno al QR

const stripSlashes = (base) => base.replace(/\/+$/, '');
export const siteUrl = (base) => `${stripSlashes(base)}/`;
export const houseUrl = (base, number) => `${stripSlashes(base)}/vota/${number}`;

export function parseNumbers(spec) {
  const fail = (why) => {
    throw new Error(`--numbers non valido (${why}): usa interi positivi, intervalli e liste, es. 1-40 oppure 1-12,15,20-22`);
  };
  if (typeof spec !== 'string' || !spec.trim()) fail('manca');
  const numbers = new Set();
  for (const part of spec.split(',')) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!match) fail(`"${part.trim()}"`);
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (from < 1 || to < from || to > MAX_NUMBER) fail(`"${part.trim()}", ammessi 1-${MAX_NUMBER}`);
    for (let n = from; n <= to; n++) numbers.add(n);
  }
  return [...numbers].sort((a, b) => a - b);
}

// Un solo <path> con un quadratino per modulo scuro; viewBox senza width/height. Correzione d'errore Q.
export function qrSvg(text) {
  const qr = qrcode(0, 'Q');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = count + QUIET_ZONE * 2;
  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>\n`;
}

function main() {
  const arg = (name) => {
    const index = process.argv.indexOf(`--${name}`);
    return index > -1 ? process.argv[index + 1] : undefined;
  };
  const usage = 'Uso: node scripts/qr.mjs --numbers 1-40 --out <cartella> [--base-url https://bagna-halloween.netlify.app]';
  try {
    const out = arg('out');
    if (!out) throw new Error(`--out mancante.\n${usage}`);
    const numbers = parseNumbers(arg('numbers'));
    const base = arg('base-url') ?? DEFAULT_BASE_URL;
    if (!/^https?:\/\/[^\s/]+/.test(base)) throw new Error('--base-url non valido: deve iniziare con http:// o https://');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'qr-sito.svg'), qrSvg(siteUrl(base)));
    for (const n of numbers) writeFileSync(join(out, `qr-casa-${n}.svg`), qrSvg(houseUrl(base, n)));
    console.log(`[fatto] qr-sito.svg + ${numbers.length} QR casa in ${out} (base ${stripSlashes(base)})`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
