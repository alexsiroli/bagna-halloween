# Passaggio all'edizione 2026

Questi passi toccano la **produzione**. Nessuno di questi comandi e' stato lanciato durante lo
sviluppo, che e' avvenuto solo sugli emulatori (`npm test`). Gli script sono stati provati
sull'emulatore con dati finti. La checklist breve e' in [`PROCEDURA-2026.md`](../PROCEDURA-2026.md).

Da fare entro il 25 ottobre, con le votazioni chiuse.

**Chi fa cosa.** Il CEO non usa il terminale: lavora da console web (Firebase, Google Cloud,
Netlify) e dalla dashboard. I comandi li esegue il release-manager dal Mac mini, in zsh, con
percorsi assoluti, `npm --prefix`, `git -C` e un comando per volta.

**L'ordine dei passi 1-6 e' tassativo** (indicazione del security-auditor): prima si salva il
piano di ritorno, poi si prepara il database, solo alla fine si pubblicano regole e sito.

## 0. Prerequisiti

CEO:

- Dashboard > Collegamenti: Firebase `bagna-halloween` collegato (id progetto: lo dice il proxy
  in `netlify.toml`; verificalo in Console Firebase, Impostazioni progetto).
- Piano **Blaze** con avviso di spesa a 5 euro.
- Un **service account** per gli script: Console Firebase, Impostazioni progetto, Account di
  servizio, "Genera nuova chiave privata". Consegna il JSON dalla dashboard (Consegne) e non
  condividerlo altrove.

Release-manager:

- Cartella privata **fuori dal repo**, solo per l'utente:
  `mkdir -p /Volumes/Dev/privati/bagna-halloween` e poi `chmod 700 /Volumes/Dev/privati/bagna-halloween`.
- La chiave consegnata va in `/Volumes/Dev/privati/bagna-halloween/sa.json` (`chmod 600`);
  la copia in `consegne/in-arrivo/` si cancella e si annota in `consegne/registro.md`.
- Repo aggiornato: `git -C /Volumes/Dev/repos/bagna-halloween branch --show-current` deve dire
  `develop`, poi `git -C /Volumes/Dev/repos/bagna-halloween pull --ff-only` e
  `npm --prefix /Volumes/Dev/repos/bagna-halloween ci`.
- `firebase-tools` installato e con il login del progetto.

Gli script (`export-edition.mjs`, `prepare-edition.mjs`) si rifiutano di partire se la chiave
(`GOOGLE_APPLICATION_CREDENTIALS`) sta dentro il repo. Il resto dei comandi la passa con
`env GOOGLE_APPLICATION_CREDENTIALS=... node ...`, cosi' non resta nell'ambiente della shell.

## 1. Salva le regole pubblicate oggi (piano di ritorno)

Chi: **CEO** in console, poi **release-manager** sul Mac mini.

Console Firebase, Firestore, **Regole**. Il CEO copia il testo attuale e lo consegna dalla
dashboard come file di testo; il release-manager lo salva in
`/Volumes/Dev/privati/bagna-halloween/regole-pubblicate.rules` e lo confronta con
`firestore.rules` del repo. Se oggi le regole permettono a chiunque di scrivere `houses` o
`config`, il sito e' esposto finche' non si arriva al passo 5.

## 2. Crea la allowlist degli admin

Chi: **CEO** in console. Serve prima: l'elenco delle email degli organizzatori.

Console Firebase, Firestore, Dati: collezione `config`, documento `admins`, campo `emails`
di tipo **array** con le email Google degli organizzatori, **in minuscolo**, una per
elemento. Esempio: `["organizzatore@example.com"]`.

Solo chi e' in questa lista (con email verificata, come tutte quelle Google) puo' aprire
l'area admin e scrivere case e configurazione. Per aggiungere un admin in futuro basta
modificare l'array.

## 3. Archivia il 2025 (sola lettura, fuori dal repo)

Chi: **release-manager**. Serve prima: passi 0, 1 e 2.

```zsh
env GOOGLE_APPLICATION_CREDENTIALS=/Volumes/Dev/privati/bagna-halloween/sa.json node /Volumes/Dev/repos/bagna-halloween/scripts/export-edition.mjs 2025 --out /Volumes/Dev/privati/bagna-halloween
```

Crea `/Volumes/Dev/privati/bagna-halloween/edizione-2025.json` con case, voti, config e un
riepilogo con medie e conteggi per casa. Lo script fa solo letture. `--out` e' obbligatorio e
lo script esce con errore se la cartella (anche scritta con `../`) sta dentro il repo: il file
contiene uid e nomi dei votanti. La riga `exports/` in `.gitignore` resta solo come rete di
sicurezza.

I documenti senza campo `edition` vengono considerati 2025.

## 4. Prepara il 2026

Chi: **release-manager**. Serve prima: l'export del passo 3.

Prima la prova, che non scrive nulla e stampa il piano:

```zsh
env GOOGLE_APPLICATION_CREDENTIALS=/Volumes/Dev/privati/bagna-halloween/sa.json node /Volumes/Dev/repos/bagna-halloween/scripts/prepare-edition.mjs --from 2025 --to 2026 --export-dir /Volumes/Dev/privati/bagna-halloween
```

Se il piano torna (numero di case da marcare, `config/app` attuale), applica con lo stesso
comando e `--apply` in fondo. Se non torna, ci si ferma e si scrive al tech-lead.

Cosa fa: aggiunge `edition: 2025` alle case che non l'hanno, imposta `config/app` con
`edition: 2026` e `votingOpen: false`, e azzera `config/results` (classifica non
pubblicata). Non cancella niente: le case e i voti 2025 restano nel database, filtrati per
edizione. Senza l'export del passo 3 (cercato in `--export-dir`) lo script si rifiuta di
applicare.

## 5. Pubblica le regole

Chi: **release-manager**. Serve prima: passi 1-4 completati.

```zsh
firebase deploy --only firestore:rules --project bagna-halloween --config /Volumes/Dev/repos/bagna-halloween/firebase.json
```

Ritorno indietro: il CEO incolla nella console le regole salvate al passo 1 e pubblica.

Nota: da qui la vecchia versione del sito non puo' piu' salvare voti (i voti ora richiedono
`edition`). Con le votazioni chiuse dal passo 4 non e' un problema: si passa subito al sito.

## 6. Sito (solo dopo il passo 5)

### Mappa 2026

Serve un'immagine `public/mappa-2026.webp`, larga circa 2000-2400 px e sotto i 600 KB. Dal
PDF dell'organizzazione, per esempio con ImageMagick:

```zsh
magick -density 200 "mappa-2026.pdf[0]" -resize 2400x -quality 80 public/mappa-2026.webp
```

oppure con `ffmpeg` da un PNG esportato: `ffmpeg -i mappa-2026.png -vf scale=2400:-1 -quality 80 public/mappa-2026.webp`.
Il file arriva in `develop` con una PR come ogni altra modifica. Finche' il file manca, la
pagina Mappa mostra il link al PDF (`VITE_MAP_URL` o `/map.pdf`).

Il vecchio `public/map.pdf` (14 MB) resta solo come ripiego: quando la webp c'e' si puo'
togliere e lasciare `VITE_MAP_URL` puntato al PDF su Drive.

### Netlify (release-manager)

Variabili (Site settings, Environment variables), stesse di oggi piu' eventuali nuove:

| Variabile | Valore |
|---|---|
| `VITE_FIREBASE_*` | invariati |
| `VITE_ADMIN_ROUTE` | facoltativa (default `/admin`); ora e' solo un indirizzo, non una protezione |
| `VITE_MAP_URL` | link al PDF di ripiego (facoltativa) |
| `VITE_MAP_IMAGE` | **non** impostarla in produzione (serve solo per la mappa segnaposto) |

Non impostare mai `VITE_USE_EMULATORS` su Netlify. Le variabili segrete si scrivono solo con
l'helper dell'HQ (`ops/bin/imposta-env`).

Prima un deploy di anteprima da `develop`.

### Prova generale (CEO, da telefono, sull'anteprima)

1. Home: "Edizione 2026 · votazioni chiuse".
2. Area admin con un account **non** in lista: deve dire "non autorizzato".
3. Area admin con il tuo account: aggiungi le case 2026, posiziona ognuna cliccando sulla
   mappa, poi "Apri votazioni".
4. Vota una casa, controlla "I miei voti", poi rimetti in pausa.
5. Mappa: la torcia segue il dito e "Accendi le luci" funziona.

### Produzione

Solo con la prova generale superata: il release-manager apre la PR di release `develop` verso
`main`; il CEO la conferma dalla dashboard (Serve te > Release pronta) e il release-manager
esegue il merge dopo la conferma. Nessuno fa `git merge` su `main` a mano.

La sera del 31 il CEO, dall'area admin: "Apri votazioni"; a fine serata "Metti in pausa" e,
quando vuole, "Pubblica classifica" (le case si accendono sulla mappa in ordine).

Le nuove case hanno id `2026_<numero>`, i voti `2026_<uid>_<numero>`: nessuna collisione con
il 2025.

## 7. Dopo l'evento

- **Entro 30 giorni dalla premiazione** si cancellano l'export e i voti. Release-manager:
  `rm /Volumes/Dev/privati/bagna-halloween/edizione-2025.json` (e ogni altro export in quella
  cartella), poi `rmdir /Volumes/Dev/privati/bagna-halloween`. La cancellazione dei voti in
  Firestore (collezione `votes`) si fa solo su richiesta esplicita del tech-lead.
- **Revoca la chiave del service account:** il CEO, in console Google Cloud, IAM, Account di
  servizio, elimina la chiave; il release-manager cancella `sa.json`.
- Il release-manager scrive nella issue la data di cancellazione e di revoca.
