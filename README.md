# Halloween Houses Web App

Applicazione React + Vite per gestire la votazione delle case di Halloween, con autenticazione Google e backend su Firebase. Il deploy previsto è su Netlify.

## Stack

- Vite + React 19
- Firebase Authentication (Google) e Firestore
- Hosting statico: Netlify (redirect SPA configurato in `netlify.toml`)

## Funzionalità principali

- Home mobile-first con invito al voto, contest fotografico e download della mappa.
- Pagina contest informativa senza requisiti di login.
- Pagina voto protetta da login Google:
  - Stato votazioni in tempo reale (`config/app` in Firestore).
  - Ricerca rapida per numero casa + filtri (tutte, votate, non votate).
  - Due voti distinti (addobbi, spettacoli) con zucche cliccabili.
  - Sezione “I miei voti”.
- Area admin raggiungibile solo tramite link diretto:
  - Toggle votazioni aperte/chiuse.
  - Gestione CRUD case (titolo, descrizione, visibilità).
  - Statistiche con medie per casa e conteggio voti.
  - Grafico temporale (gruppo 10 minuti) sul flusso voti.

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
VITE_ADMIN_ROUTE=/admin-halloween-2025
```

Su Netlify inserisci gli stessi valori in **Site settings → Build & deploy → Environment**.

## Firebase

1. Crea un progetto Firebase e abilita Authentication → Sign-in method → Google.
2. Abilita Firestore in modalità Production.
3. Crea le seguenti collezioni/documenti:
   - `houses` (id consigliato = numero casa).
   - `votes` (id consigliato = `uid_houseNumber`).
   - `config/app` con `{ votingOpen: true }`.
4. Regole Firestore di partenza (adatta alle tue necessità):

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /houses/{houseId} {
         allow read: if true;
         allow write: if false; // solo admin via app.
       }

       match /votes/{voteId} {
         allow read: if request.auth != null && request.auth.uid == resource.data.userId;
         allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
       }

       match /config/{docId} {
         allow read: if true;
         allow write: if false;
       }
     }
   }
   ```

## Build e deploy

```bash
npm run build
```

Il comando produce la cartella `dist/`. Su Netlify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- Abilita l’opzione “Deploys from Git” oppure pubblica manualmente.

---

Per personalizzazioni rapide (colori, layout) modifica `src/styles/halloween.css`. Per ulteriori rotte o componenti aggiungi file dentro `src/routes` e `src/components`.
