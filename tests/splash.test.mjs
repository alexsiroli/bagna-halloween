// Splash Orbita su iPhone (#76): immagini d'avvio per ogni iPhone, fondo nel primo HTML, barra di stato della web app.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { barraSopra } from '../src/barraSopra.js';

const indice = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// iPhone in verticale: larghezza e altezza in punti CSS, densita'. Senza un'immagine per la sua misura iOS mostra
// la schermata salvata alla prima apertura.
const IPHONE = [
  [375, 667, 2], // SE 2/3, 8
  [414, 736, 3], // 8 Plus
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 2], // XR, 11
  [414, 896, 3], // XS Max, 11 Pro Max
  [390, 844, 3], // 12, 13, 14, 16e
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [420, 912, 3], // Air
];

// larghezza e altezza in pixel dall'intestazione PNG (IHDR)
const misuraPng = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];

test("immagine d'avvio iOS per ogni iPhone attuale, alla misura giusta in pixel", () => {
  for (const [w, h, d] of IPHONE) {
    const media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`;
    const link = indice.match(new RegExp(`<link rel="apple-touch-startup-image" href="([^"]+)" media="${media.replace(/[()]/g, '\\$&')}"`));
    assert.ok(link, `manca l'immagine d'avvio per ${w}x${h}@${d}`);
    const png = readFileSync(new URL(`../public${link[1]}`, import.meta.url));
    assert.deepEqual(misuraPng(png), [w * d, h * d], link[1]);
  }
});

test('il primo fotogramma e\' il fondo della splash, prima di CSS e JS', () => {
  assert.match(indice, /<style>html,body\{background:#0b1224\}<\/style>/);
});

// barraSopra(schermo, alto, largo, ios, installata, ultimo): punti della barra di stato sopra la web app.
test('barraSopra: web app sulla Home di iPhone, la barra di stato sta sopra la pagina', () => {
  assert.equal(barraSopra(852, 793, 393, true, true, 0), 59);
  assert.equal(barraSopra(874, 812, 402, true, true, 0), 62);
});

test('barraSopra: zero in Safari, su Android, in orizzontale e quando la pagina arriva al vetro', () => {
  assert.equal(barraSopra(852, 852, 393, true, true, 59), 0); // iOS ha riportato la pagina a tutto schermo
  assert.equal(barraSopra(852, 793, 393, true, false, 0), 0); // Safari: sotto ci sono le barre del browser
  assert.equal(barraSopra(852, 793, 393, false, true, 0), 0); // Android: barra di navigazione vera
  assert.equal(barraSopra(852, 393, 793, true, true, 59), 0); // orizzontale: screen.height non ruota
});

test("barraSopra: con la tastiera aperta (oltre 120) tiene l'ultimo valore buono, non azzera", () => {
  assert.equal(barraSopra(852, 500, 393, true, true, 59), 59);
  assert.equal(barraSopra(852, 500, 393, true, true, 0), 0); // tastiera aperta gia' all'avvio
});
