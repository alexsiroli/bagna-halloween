---
version: 1
slug: "src-routes-vote-jsx"
primary_target: "src/routes/Vote.jsx"
related_targets: ["src/routes/Home.jsx","src/routes/Admin.jsx","src/routes/Contest.jsx"]
---

## Scope
Tutta l'app pubblica (home, mappa, voto, i miei voti, contest) e l'area admin. Modo: Operate
(voto, admin) con home e mappa in registro Experience leggero. Decisioni delegate
dall'utente: nessun round di domande, direzione vincolata dal brief "Il quartiere di notte".

## Audience e compito
Persone del paese a piedi, al buio, telefono in una mano: trovare la casa e votarla in tre
tocchi. Admin: aprire/chiudere, posizionare case sulla mappa, leggere medie e flusso,
pubblicare la classifica.

## Direction contract
THESIS: Bagnarola di notte vista come una festa di paese: vie buie, case che sono punti di
luce, luminarie che si accendono. Rifiuta l'Halloween di catalogo (nero, arancio, viola,
fantasmi emoji, font "horror").
OWN-WORLD: fondo blu inchiostro #0b1224, muri in ombra #111a33/#1a2547, testo luna #f4efe4,
luce di lampione #ffb238 per le azioni, zucca #ff6b1a per i voti, finestre accese #ffe19a,
targhe civiche in ceramica #f4efe4 con numero in smalto #1c2f7a. Lettering da manifesto
di sagra (Bowlby One), corpo Atkinson Hyperlegible Next. Filo di lampadine come
progresso e come grafico.
STORY: capisco che e' la sera delle case di Bagnarola 2026, vedo se si vota adesso, entro,
cerco il numero o tocco la casa sulla mappa, accendo le zucche, salvo, passo alla prossima.
FIRST VIEWPORT: mobile 390x844: in alto nome dell'evento in lettering grande su due righe,
stato votazioni come lampadina accesa/spenta; sotto, skyline di case di paese con finestre
che si accendono una dopo l'altra; poi il bottone "Vota le case" a tutta larghezza (64 px),
e due righe-azione per Mappa e Contest.
FORM: candidato 5 della lista (luminarie della festa) fuso con il mondo vincolato dal brief
(quartiere di notte, torcia, case che si accendono). Seed c26fcafb. Rilanci dai challenger
scartati: dalla camera oscura "anteprima prima di confermare" (le zucche si accendono prima
di salvare); dal feed verticale "la prossima e' gia' pronta" (dopo il salvataggio il campo
numero torna vuoto, pronto per la prossima); dal disco pop "un colore di fondo per edizione, senza
esitazioni".
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Momento memorabile
La torcia sulla mappa: il quartiere e' buio, il dito o il puntatore illumina le vie; le case
restano puntini di luce. A risultati pubblicati le case si accendono in ordine di classifica.

## Decisioni aperte
Mappa 2026 reale (webp) fornita dall'utente; per ora segnaposto SVG dichiarato.
