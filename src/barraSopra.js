// #76, ricetta AlxStudio/knowledge/ricette/pwa-ios-altezza-tastiera.md. Da web app sulla Home di iPhone (manifest
// standalone, barra di stato normale) iOS mette la pagina sotto la barra di stato: il viewport e' piu' corto del vetro
// (793 su 852) e la splash, centrata nel viewport, finirebbe mezza barra sotto il centro dello schermo. Restituisce i
// punti della barra, che la splash aggiunge in fondo. Regola della dashboard: oltre 120 e' la tastiera aperta e si
// tiene `ultimo` (azzerare spostava la splash, frame-gallery #5); zero o meno vale zero.
export function barraSopra(schermo, alto, largo, ios, installata, ultimo) {
  if (!ios || !installata || alto < largo) return 0; // in orizzontale screen.height non ruota: lo scarto sarebbe finto
  const d = Math.round(schermo - alto);
  if (d <= 0) return 0;
  return d <= 120 ? d : ultimo;
}
