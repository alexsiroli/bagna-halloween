# Product

<!-- impeccable:product-schema 1 -->

> Record dedotto dal README e dal codice (2026-09-29) senza intervista: l'utente ha delegato
> le decisioni. I fatti marcati *(dedotto)* vanno confermati alla prima occasione.

## Platform

web

## Users
- **Chi vota:** abitanti e visitatori di Bagnarola (Cesenatico) che la sera del 31 ottobre
  girano a piedi per il paese tra le case addobbate. Famiglie con bambini, ragazzi, anziani
  *(dedotto: "l'app la usa tutto il paese")*. Telefono in una mano, spesso l'altra occupata
  (un bambino, il sacchetto dei dolci, un ombrello), al buio o sotto i lampioni, luminosita'
  dello schermo bassa.
- **Chi organizza:** pochi admin (il comitato) che creano le case, aprono e chiudono le
  votazioni, seguono il flusso dei voti in tempo reale e decretano la classifica.

## Product Purpose
Far votare le case di Halloween di Bagnarola in una sera, da telefono, senza attriti: trovi la
casa (numero o mappa), dai un voto da 6 a 10 con le zucche, vai alla prossima. A fine serata
gli admin hanno medie e conteggi affidabili e possono pubblicare la classifica.
Successo: tanta gente vota tante case, nessun voto perso o falsato, zero dubbi sul risultato.

## Positioning
E' la festa di un paese, non una piattaforma: una sola sera, un solo percorso, case con un
numero civico vero. Nessun prodotto generico di sondaggi conosce le vie di Bagnarola.

## Operating Context
- Evento serale all'aperto, 31 ottobre, circa 18-23 *(dedotto)*.
- Accesso con Google (un voto per persona per casa, modificabile finche' le votazioni sono aperte).
- Mappa del percorso: storicamente un PDF da 14 MB; dal 2026 una mappa interattiva (OpenStreetMap)
  costruita dagli indirizzi delle case, con le posizioni ritoccabili dall'admin.
- Contest fotografico parallelo su Instagram con hashtag dell'edizione.
- Ogni anno una nuova edizione (2025, 2026, ...): le case e i voti appartengono a un'edizione.
- Deploy statico su Netlify, backend Firebase (Auth Google + Firestore).

## Capabilities and Constraints
- Voto intero da 6 a 10 per casa, uno per utente per casa per edizione.
- Area admin su route fissa `/admin`, protetta da login Google e
  allowlist `config/admins`; le regole Firestore sono l'unica vera protezione.
- I voti altrui non sono leggibili dal pubblico; medie e classifica le vede l'admin, che puo'
  pubblicarne l'ordine.
- Mobile first; deve funzionare a una mano, al buio, con connessione del paese.

## Brand Commitments
- Nome: "Halloween di Bagnarola"; hashtag `#BagnaHalloween<anno>`.
- Crediti: pagina `/alex-siroli` e footer "Sito sviluppato da Alex Siroli".
- Icone e favicon esistenti in `public/` (zucca).

## Evidence on Hand
- Nessuna foto reale delle case nel repo; l'elenco delle case 2026 arriva dall'organizzazione.
- Non inventare premi, sponsor, orari o numeri di partecipanti: non sono documentati.

## Product Principles
1. Il voto viene prima di tutto: tre tocchi dalla casa al voto salvato.
2. Si legge al buio: contrasto alto, testi grandi, target generosi.
3. Il paese e' il protagonista: numeri civici, vie, case; non l'Halloween di catalogo.
4. Fiducia nel risultato: regole server, niente trucchi lato client.

## Accessibility & Inclusion
Pubblico di tutte le eta', anche anziani: testi leggibili senza occhiali in penombra
(corpo >= 17 px), target >= 48 px nel flusso di voto, nessuna informazione affidata al solo
colore, `prefers-reduced-motion` rispettato, uso completo da tastiera.
