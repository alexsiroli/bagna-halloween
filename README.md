# Halloween di Bagnarola

Applicazione React + Vite per gestire la votazione delle case di Halloween, con autenticazione Google e backend su Firebase. Il deploy previsto è su Netlify.

## Stack

- Vite + React 19
- Firebase Authentication (Google) e Firestore
- Hosting statico: Netlify (redirect SPA configurato in `netlify.toml`)

## Funzionalità principali

- Home mobile-first con stato dell'edizione e delle votazioni, mappa e contest fotografico.
- Mappa del quartiere (`/mappa`) al buio con torcia e bottone "Accendi le luci"; le case sono
  posizionate dall'admin e, a classifica pubblicata, si accendono in ordine.
- Pagina contest con l'hashtag dell'edizione (`#BagnaHalloween<anno>`).
- Pagina voto protetta da login Google:
  - Stato votazioni in tempo reale (`config/app` in Firestore).
  - Ricerca rapida per numero casa, o tocco sulla casa nella mappa.
  - Voto unico per casa (scala 6-10) con zucche.
  - Sezione "I miei voti".
- Area admin (route `VITE_ADMIN_ROUTE`, default `/admin`) protetta da login Google e dalla
  allowlist `config/admins`:
  - Apertura/chiusura votazioni e pubblicazione della classifica.
  - Gestione case (titolo, descrizione, visibilita', posizione sulla mappa).
  - Statistiche con medie per casa e conteggio voti, flusso voti a fasce da 10 minuti.

Direzione visiva: `DESIGN.md`. Contesto di prodotto: `PRODUCT.md`.

## Avvio locale

```bash
npm install
npm run dev
```

> Nota: su alcuni ambienti Node molto recenti l’installazione di `esbuild` potrebbe richiedere una versione aggiornata. In caso di errori, usare Node LTS 20 oppure forzare l’installazione di `esbuild@latest`.

## Variabili d’ambiente

Compila `.env` partendo da `.env.example`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=....firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=....appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_MAP_URL=https://drive.google.com/...
VITE_ADMIN_ROUTE=/admin
```

> Il dominio configurato viene usato come fallback in locale. In produzione l’app forza automaticamente l’hostname corrente (es. `bagna-halloween.netlify.app`) per evitare errori di login con Google.

Su Netlify inserisci gli stessi valori in **Site settings → Build & deploy → Environment**.

## Firebase

1. Progetto Firebase con Authentication, metodo Google abilitato, e Firestore.
2. Modello dati (tutto per edizione):
   - `config/app`: `{ votingOpen, edition }` (es. `edition: 2026`).
   - `config/admins`: `{ emails: [...] }` email Google degli organizzatori, in minuscolo.
   - `config/results`: `{ edition, published, ranking: [numeri casa in ordine] }`.
   - `houses/<edizione>_<numero>`: `{ number, title, description, street, civic, lat, lng, visible, edition }`
     con `lat, lng` WGS84 (opzionali: senza posizione la casa sta in elenco sotto la mappa).
   - `votes/<edizione>_<uid>_<numero>`: `{ userId, houseNumber, score, edition, createdAt, updatedAt }`.
3. Regole: `firestore.rules` (versionate, testate). Pubblicazione:
   `firebase deploy --only firestore:rules --project <id>`.
4. In **Authentication, Settings, Authorized domains** aggiungi `localhost`, `127.0.0.1`, il
   dominio Firebase e quello pubblico (es. `bagna-halloween.netlify.app`).
5. Cambio di edizione: `docs/EDIZIONE-2026.md` (export in sola lettura, preparazione,
   deploy).

## Emulatori e test

Serve Java 21 per gli emulatori (`JAVA_HOME`). Tutto gira sul progetto finto
`demo-bagna-halloween`: nessuna chiamata raggiunge la produzione.

```bash
npm test             # emulatori + test delle regole + seed finto + smoke Playwright
npm run test:rules   # solo le regole
npm run emulators    # emulatori firestore 8181 e auth 9191, da lasciare aperti
npm run seed:emulator  # con FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST impostati
npm run dev:emulator   # app su http://localhost:4101 collegata agli emulatori
```

Il seed crea 12 case inventate con via, civico e posizione (due senza), 40 votanti finti e tre utenti Google
dell'emulatore: `admin@esempio.test` (admin), `votante@esempio.test`, `curioso@esempio.test`.
Per la mappa con la classifica accesa: `node scripts/seed-emulator.mjs --results`.

## Build e deploy

```bash
npm run build
```

Il comando produce la cartella `dist/`. Su Netlify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- Il file `netlify.toml` include già il proxy `/__/auth/*` verso Firebase per mantenere il login sullo stesso dominio dell’app.
- Abilita l’opzione “Deploys from Git” oppure pubblica manualmente.

---

Colori, font, misure e tempi sono token in cima a `src/styles/halloween.css` (vedi `DESIGN.md`). Per ulteriori rotte o componenti aggiungi file dentro `src/routes` e `src/components`.
