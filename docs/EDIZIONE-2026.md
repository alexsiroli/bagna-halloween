# Passaggio all'edizione 2026

Questi passi toccano la **produzione**. Nessuno di questi comandi e' stato lanciato durante lo
sviluppo, che e' avvenuto solo sugli emulatori (`npm test`). Gli script sono stati provati
sull'emulatore con dati finti. La checklist breve e' in [`PROCEDURA-2026.md`](../PROCEDURA-2026.md).

Da fare entro il 25 ottobre, con le votazioni chiuse.

**Chi fa cosa.** Il CEO non usa il terminale: lavora da console web (Firebase, Google Cloud,
Netlify) e dalla dashboard. I comandi li esegue il release-manager dal Mac mini, in zsh, con
percorsi assoluti, `npm --prefix`, `git -C` e un comando per volta.

**L'ordine dei passi 1-6 e' tassativo** (indicazione del security-auditor): prima si salva il
piano di ritorno e si crea la allowlist, poi si pubblicano le regole e il CEO ricontrolla la
console (3b), solo dopo si esporta e si prepara il database (4-5), alla fine il sito. Export e
prepare usano l'Admin SDK e non dipendono dalle regole: pubblicandole prima, la finestra in cui
chiunque puo' scrivere tra gli admin si chiude prima.

## 0. Prerequisiti

CEO:

- Dashboard > Collegamenti: Firebase `bagna-halloween` collegato (id progetto: lo dice il proxy
  in `netlify.toml`; verificalo in Console Firebase, Impostazioni progetto).
- Piano **Blaze** con avviso di spesa a 5 euro.
- Una **chiave di service account** per gli script. Consigliato: in Google Cloud, IAM, un
  account di servizio dedicato con il solo ruolo **Cloud Datastore User**, e la chiave JSON
  generata da li'. In alternativa, Console Firebase, Impostazioni progetto, Account di servizio,
  "Genera nuova chiave privata" (ruoli piu' ampi, compresa la creazione di token). Consegna il
  JSON dalla dashboard (Consegne) e non condividerlo altrove. Si revoca subito dopo il passo 5.

Release-manager:

- Cartella privata **fuori dal repo**, in home, solo per l'utente (700, file 600). La crea e la
  gestisce `scripts/private.mjs` (vedi `scripts/private-dir.mjs`): i comandi degli agenti non la
  nominano mai, il guard li blocca. Non si legge e non si elenca.
- La chiave consegnata si importa con
  `node /Volumes/Dev/repos/bagna-halloween/scripts/private.mjs import-key /Users/alexsiroli/AlxStudio/consegne/in-arrivo/<file>`:
  la sposta nella cartella come `service-account.json` (600; il nome conta, i divieti di lettura
  degli agenti coprono `*service-account*.json`) e l'originale sparisce. L'operazione si annota in
  `consegne/registro.md`; la data di consegna si scrive nella issue #7.
- Repo aggiornato, con albero pulito (`git -C /Volumes/Dev/repos/bagna-halloween status --short`
  non stampa nulla). Se `git -C /Volumes/Dev/repos/bagna-halloween branch --show-current` dice
  `main`: `git -C /Volumes/Dev/repos/bagna-halloween switch develop`. Poi
  `git -C /Volumes/Dev/repos/bagna-halloween pull --ff-only` e
  `npm --prefix /Volumes/Dev/repos/bagna-halloween ci`.
- `firebase-tools` installato e con il login del progetto.

Gli script (`export-edition.mjs`, `prepare-edition.mjs`) usano di default la chiave importata e la
cartella privata; `--key`, `--out` e `--export-dir` restano come alternativa e gli script si
rifiutano di partire se uno di questi sta dentro il repo, anche scritto con `../` o passando da un
symlink (come `/Users/alexsiroli/AlxStudio/progetti/...`). La chiave non passa dall'ambiente
della shell. Nessuno script stampa il contenuto dei file: solo nomi e conteggi.

## 1. Salva le regole pubblicate oggi (piano di ritorno)

Chi: **CEO** in console, poi **release-manager** sul Mac mini.

Console Firebase, Firestore, **Regole**. Il CEO copia il testo attuale e lo consegna dalla
dashboard come file di testo; il release-manager lo salva con
`node /Volumes/Dev/repos/bagna-halloween/scripts/private.mjs import-rules /Users/alexsiroli/AlxStudio/consegne/in-arrivo/<file>`
(diventa `regole-pubblicate.rules` nella cartella privata). Il confronto con
`firestore.rules` del repo si fa **prima** dell'import, sul file ancora in `consegne/in-arrivo/`:
dopo, il file sta nella cartella privata e gli agenti non possono leggerlo. Se oggi le regole permettono a chiunque di scrivere `houses` o
`config`, il sito e' esposto finche' non si arriva al passo 3: va scritto nella issue #7 e il
controllo del passo 3b diventa obbligatorio anche sui dati 2025 (case modificate, admin aggiunti).

## 2. Crea la allowlist degli admin

Chi: **CEO** in console. Serve prima: l'elenco delle email degli organizzatori.

Console Firebase, Firestore, Dati: collezione `config`, documento `admins`, campo `emails`
di tipo **array** con le email Google degli organizzatori, **in minuscolo**, una per
elemento. Esempio: `["organizzatore@example.com"]`.

Solo chi e' in questa lista (con email verificata, come tutte quelle Google) puo' aprire
l'area admin e scrivere case e configurazione. Per aggiungere un admin in futuro basta
modificare l'array.

## 3. Pubblica le regole

Chi: **release-manager**. Serve prima: passi 0, 1 e 2 completati.

`firebase deploy` dagli agenti oggi e' negato dal guard: prima del passo serve il permesso del CEO (`ops/bin/chiedi-permesso`), chiesto dal release-manager.

```zsh
firebase deploy --only firestore:rules --project bagna-halloween --config /Volumes/Dev/repos/bagna-halloween/firebase.json
```

Ritorno indietro: il CEO incolla nella console le regole salvate al passo 1 e pubblica.

Nota: da qui la vecchia versione del sito non puo' piu' salvare voti (i voti ora richiedono
`edition`). Con le votazioni chiuse non e' un problema: si passa al sito dopo i passi 4 e 5.

### 3b. Ricontrollo in console

Chi: **CEO**, subito dopo il passo 3. Fino a li' le regole vecchie potevano essere aperte e
qualcuno puo' aver scritto dati (anche `config/admins`, di cui le nuove regole si fidano). In
console, Firestore, Dati:

- `config/admins`, campo `emails`: solo le email attese e nient'altro.
- `config/app` e `config/results`: nessun valore estraneo.
- Collezione `houses`: nessuna casa con id `2026_*` gia' presente.

Se qualcosa non torna, **ferma tutto e avvisa il tech-lead**: non si procede con i passi 4-6.

## 4. Archivia il 2025 (sola lettura, fuori dal repo)

Chi: **release-manager**. Serve prima: passi 0-3 e il ricontrollo 3b.

```zsh
node /Volumes/Dev/repos/bagna-halloween/scripts/export-edition.mjs 2025
```

Crea `edizione-2025.json` nella cartella privata (permessi 600) con case, voti,
config e un riepilogo con medie e conteggi per casa; stampa solo i conteggi. Lo script fa solo
letture. Se si passano `--out` o `--key`, lo script esce con errore quando uno dei due (anche
scritto con `../` o via symlink) sta dentro il repo: il file contiene uid e nomi dei votanti. La riga `exports/`
in `.gitignore` resta solo come rete di sicurezza.

I documenti senza campo `edition` vengono considerati 2025.

## 5. Prepara il 2026

Chi: **release-manager**. Serve prima: l'export del passo 4.

Prima la prova, che non scrive nulla e stampa il piano:

```zsh
node /Volumes/Dev/repos/bagna-halloween/scripts/prepare-edition.mjs --from 2025 --to 2026
```

Se il piano torna (numero di case da marcare, `config/app` attuale), applica con lo stesso
comando e `--apply` in fondo. Se non torna, ci si ferma e si scrive al tech-lead.

Cosa fa: aggiunge `edition: 2025` alle case che non l'hanno, imposta `config/app` con
`edition: 2026` e `votingOpen: false`, e azzera `config/results` (classifica non
pubblicata). Non cancella niente: le case e i voti 2025 restano nel database, filtrati per
edizione. Senza l'export del passo 4 (cercato nella cartella privata o in `--export-dir`, che deve stare fuori dal
repo) lo script si rifiuta di applicare.

### 5b. Revoca la chiave

Subito dopo il passo 5 e dopo l'import della mappa (passo 6, punto 4: e' l'ultimo che usa la chiave); il passo 7 non la usa. Il **CEO**, in console Google Cloud, IAM,
Account di servizio, elimina la chiave (e l'account di servizio, se creato apposta). Il
**release-manager** scrive nella issue #7 le date di consegna e di revoca. Il file della chiave,
ormai inerte, sparisce con il comando di pulizia del passo 7 (`clean` cancella tutto: non
lanciarlo prima, export e regole servono ancora).

## 6. Sito (solo dopo il passo 5)

### Mappa 2026

La mappa nasce dagli indirizzi delle case (Leaflet + tessere OpenStreetMap, nessuna immagine da
preparare). Le posizioni sono dati della casa (`lat`, `lng`): si ricavano una volta sola, qui, non a ogni visita.

1. **File elenco.** Lo prepara un agente dalla lista del CEO: CSV con intestazione
   `numero;titolo;via;civico;descrizione;tipo;lat;lng` (anche con la virgola, anche con BOM) oppure JSON con gli stessi
   campi in inglese. Esempio: `seeds/houses-2026.example.csv`. `lat` e `lng` si lasciano vuote. `tipo` (JSON `kind`) e'
   `spettacolo`, `addobbi` o vuoto; vuoto non cambia il tipo gia' scelto dall'admin.
   **Il file con gli indirizzi non entra mai nel repo** (nemmeno in una PR o in un branch): la copia di lavoro sta in
   `/Users/alexsiroli/AlxStudio/reports/piani/bagna-halloween-2026/case-2026.csv`, e anche `<elenco-posizioni.csv>` va
   scritto fuori dal repo.
2. **Geocodifica** (una volta sola, dal Mac, con rete): trova lat/lng da Nominatim, una richiesta ogni 1,1 s.

   ```zsh
   node /Volumes/Dev/worktrees/bagna-halloween/<ticket>/scripts/geocode-houses.mjs --file <elenco.csv> --out <elenco-posizioni.csv>
   ```

   Elenca le righe non trovate: restano senza posizione (compaiono sotto la mappa) finche' l'admin non le posiziona.
3. **Controllo.** Apri `<elenco-posizioni.csv>` e guarda le posizioni; correggi a mano lat/lng sbagliate. Una posizione
   fuori dal riquadro di Cesenatico viene rifiutata dall'import.
4. **Import.** Prima la prova (non scrive), poi `--apply`. Non cancella: elenca le case dell'edizione che non
   sono nel file. Una casa gia' presente e nascosta dall'admin resta nascosta (`visible: true` solo alle nuove). Chiave e cartella privata come per `prepare-edition.mjs`.

   ```zsh
   node /Volumes/Dev/worktrees/bagna-halloween/<ticket>/scripts/import-houses.mjs --edition 2026 --file <elenco-posizioni.csv>
   node /Volumes/Dev/worktrees/bagna-halloween/<ticket>/scripts/import-houses.mjs --edition 2026 --file <elenco-posizioni.csv> --apply
   ```

5. **Ritocco dall'admin.** Area admin, Modifica casa: tocca la mappa nel punto giusto e salva. Il segnaposto si
   sposta nella mappa pubblica al ricarico.

6. **Punti di servizio e strade chiuse.** Dal CSV `tipo;nome;lat;lng;precisione[;indirizzo]` (tipi: bar, food-truck, servizi-igienici,
   parcheggio, intrattenimento, strada-chiusa con una riga di inizio e una di fine per strada) si genera il file letto dalla mappa.
   Prima la prova, poi `--out` (il file e' pubblico e va nel repo; senza file la mappa funziona come prima):

   ```zsh
   node /Volumes/Dev/worktrees/bagna-halloween/<ticket>/scripts/points-file.mjs --file <punti.csv> --note "Strade chiuse al traffico dalle 18:30 alle 23:00."
   node /Volumes/Dev/worktrees/bagna-halloween/<ticket>/scripts/points-file.mjs --file <punti.csv> --note "..." --out /Volumes/Dev/worktrees/bagna-halloween/<ticket>/public/punti/2026.json
   ```

`<ticket>` e' il worktree del ticket, non il checkout principale.

### Netlify (release-manager)

Variabili (Site settings, Environment variables), stesse di oggi piu' eventuali nuove:

| Variabile | Valore |
|---|---|
| `VITE_FIREBASE_*` | invariati, tranne `VITE_FIREBASE_AUTH_DOMAIN` (vedi sotto) |
| `VITE_FIREBASE_AUTH_DOMAIN` | resta `bagna-halloween.firebaseapp.com` (valore attuale, non cambiarlo); `halloween.alxstudio.it` va solo autorizzato in Firebase Auth |
| `VITE_ADMIN_ROUTE` | facoltativa (default `/admin`); ora e' solo un indirizzo, non una protezione |

Non impostare mai `VITE_USE_EMULATORS` su Netlify. Le variabili segrete si scrivono solo con
l'helper dell'HQ: `python3 /Users/alexsiroli/AlxStudio/ops/bin/imposta-env netlify <progetto> <NOME> <ambiente>`
(valore messo dal CEO nel Portachiavi da dashboard > Collegamenti).

Prima un deploy di anteprima da `develop`.

### Prova generale (CEO, da telefono, sull'anteprima)

1. Home: "Edizione 2026 · votazioni chiuse".
2. Area admin con un account **non** in lista: deve dire "non autorizzato".
3. Area admin con il tuo account: aggiungi le case 2026, posiziona ognuna toccando la
   mappa, poi "Apri votazioni".
4. Vota una casa, controlla "I miei voti", poi rimetti in pausa.
5. Mappa: i segnaposto si vedono, tocca una casa e "Vota" porta alla votazione.

### Produzione

Solo con la prova generale superata: il release-manager apre la PR di release `develop` verso
`main`; il CEO la conferma dalla dashboard (Serve te > Release pronta) e il release-manager
esegue il merge dopo la conferma. Nessuno fa `git merge` su `main` a mano.

La sera del 31 il CEO, dall'area admin: "Apri votazioni"; a fine serata "Metti in pausa" e,
quando vuole, "Pubblica classifica" (le case si accendono sulla mappa in ordine).

Le nuove case hanno id `2026_<numero>`, i voti `2026_<uid>_<numero>`: nessuna collisione con
il 2025.

## 7. Dopo l'evento

- **Entro il 2026-11-30** (data fissa, da mettere nel calendario del release-manager) si
  cancellano export, regole salvate e chiave. Release-manager, un solo comando (cancella i file
  creati dagli script, poi la cartella se e' vuota, e stampa solo il conteggio):
  `node /Volumes/Dev/repos/bagna-halloween/scripts/private.mjs clean`. Poi scrive nella
  issue #7 la data di cancellazione.
- **Voti in Firestore (2025 e 2026):** la durata di conservazione la decide il privacy-officer
  sull'informativa. Fino ad allora restano nel database e non si cancellano. Se servira'
  cancellarli, serve una nuova chiave per quell'operazione e una richiesta esplicita del
  tech-lead.
- La chiave del service account e' gia' stata revocata al passo 5b.
